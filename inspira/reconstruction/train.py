"""
Standalone training script called by the pipeline.
Usage: python3 train.py --sparse_dir /path/sparse/0 
                        --image_dir /path/images 
                        --output /path/room.ply
"""
import argparse, sys, numpy as np
from pathlib import Path
from PIL import Image
from plyfile import PlyData, PlyElement
import torch
import gsplat
from tqdm import tqdm

def parse_args():
    p = argparse.ArgumentParser()
    p.add_argument("--sparse_dir", required=True)
    p.add_argument("--image_dir",  required=True)
    p.add_argument("--output",     required=True)
    p.add_argument("--iterations", type=int, default=30000)
    p.add_argument("--target_size", type=int, default=800)
    return p.parse_args()

def read_colmap(d):
    cams, imgs = {}, {}
    with open(f"{d}/cameras.txt") as f:
        for line in f:
            if line.startswith('#'): continue
            p = line.split()
            if len(p) < 5: continue
            cams[int(p[0])] = dict(
                fx=float(p[4]), fy=float(p[4]),
                cx=float(p[5]) if len(p)>5 else float(p[2])/2,
                cy=float(p[6]) if len(p)>6 else float(p[3])/2,
            )
    with open(f"{d}/images.txt") as f:
        lines = [l for l in f if not l.startswith('#') and l.strip()]
        for i in range(0, len(lines)-1, 2):
            p = lines[i].split()
            if len(p) < 9: continue
            qw,qx,qy,qz = float(p[1]),float(p[2]),float(p[3]),float(p[4])
            tx,ty,tz     = float(p[5]),float(p[6]),float(p[7])
            R = np.array([
                [1-2*(qy**2+qz**2), 2*(qx*qy-qw*qz), 2*(qx*qz+qw*qy)],
                [2*(qx*qy+qw*qz),   1-2*(qx**2+qz**2), 2*(qy*qz-qw*qx)],
                [2*(qx*qz-qw*qy),   2*(qy*qz+qw*qx), 1-2*(qx**2+qy**2)],
            ], dtype=np.float32)
            imgs[int(p[0])] = dict(
                R=R, t=np.array([tx,ty,tz],dtype=np.float32),
                cam_id=int(p[8]), fname=p[9]
            )
    pts, cols = [], []
    with open(f"{d}/points3D.txt") as f:
        for line in f:
            if line.startswith('#'): continue
            p = line.split()
            if len(p) < 7: continue
            pts.append([float(p[1]),float(p[2]),float(p[3])])
            cols.append([int(p[4]),int(p[5]),int(p[6])])
    return cams, imgs, np.array(pts,dtype=np.float32), np.array(cols,dtype=np.float32)/255.0

def main():
    args   = parse_args()
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    print(f"Device: {device}", flush=True)

    cams, imgs, xyz, rgb = read_colmap(args.sparse_dir)
    print(f"COLMAP: {len(imgs)} images, {len(xyz):,} points", flush=True)

    # Load images
    TARGET = args.target_size
    gt_images, valid_cams = [], []
    for idata in imgs.values():
        fpath = Path(args.image_dir) / idata['fname']
        if not fpath.exists(): continue
        cam = cams[idata['cam_id']]
        img = Image.open(fpath).convert('RGB')
        w0,h0 = img.size
        s = TARGET/max(w0,h0)
        nw,nh = int(w0*s), int(h0*s)
        img = img.resize((nw,nh), Image.LANCZOS)
        gt_images.append(
            torch.from_numpy(np.array(img,dtype=np.float32)/255.0).to(device)
        )
        valid_cams.append(dict(
            R=idata['R'], t=idata['t'],
            fx=cam['fx']*s, fy=cam['fy']*s,
            cx=cam['cx']*s, cy=cam['cy']*s,
            width=nw, height=nh,
        ))
    print(f"Loaded: {len(gt_images)} images", flush=True)

    # Init
    N = len(xyz)
    from torch import cdist
    pts_t = torch.tensor(xyz[:min(500,N)], device=device)
    d = cdist(pts_t, pts_t); d.fill_diagonal_(float('inf'))
    init_scale = max(d.min(dim=1).values.mean().item()*0.5, 0.002)

    means     = torch.tensor(xyz, device=device).requires_grad_(True)
    log_scales= (torch.ones(N,3,device=device)*init_scale).log_().detach().requires_grad_(True)
    quats     = torch.zeros(N,4,device=device); quats[:,0]=1.0
    quats     = quats.detach().requires_grad_(True)
    opacities = torch.logit(torch.full((N,),0.1,device=device)).detach().requires_grad_(True)
    rgb_t     = torch.tensor(rgb,device=device).float().clamp(1e-5,1-1e-5)
    colors    = torch.logit(rgb_t).detach().requires_grad_(True)

    def make_opt(lr=3e-4):
        return torch.optim.Adam([
            {"params":means,      "lr":lr},
            {"params":log_scales, "lr":5e-3},
            {"params":quats,      "lr":1e-3},
            {"params":opacities,  "lr":5e-2},
            {"params":colors,     "lr":2.5e-3},
        ])

    opt = make_opt(); grad_acc = torch.zeros(N, device=device)
    N_ITER=args.iterations; D_FROM=500; D_UNTIL=15000
    D_EVERY=200; P_EVERY=500; MAX_GS=300_000; LOG=3000
    losses, psnrs = [], []

    for it in tqdm(range(N_ITER), file=sys.stdout):
        LR_FINAL = 5e-6
        progress = it/N_ITER
        lr = 3e-4 * np.exp(progress * np.log(LR_FINAL/3e-4))
        for pg in opt.param_groups:
            if pg['params'][0] is means: pg['lr'] = lr

        idx = it % len(valid_cams)
        cam = valid_cams[idx]
        gt  = gt_images[idx]
        if gt.shape[0] > gt.shape[1]:
            gt = torch.rot90(gt, k=1, dims=(0,1)).contiguous()
        H,W = gt.shape[:2]

        R = torch.tensor(cam['R'],dtype=torch.float32,device=device)
        t = torch.tensor(cam['t'],dtype=torch.float32,device=device)
        w2c = torch.eye(4,device=device); w2c[:3,:3]=R; w2c[:3,3]=t

        fx = cam['fx']*W if cam['fx']<10 else cam['fx']
        fy = cam['fy']*H if cam['fy']<10 else cam['fy']
        cx = cam['cx']*W if cam['cx']<10 else cam['cx']
        cy = cam['cy']*H if cam['cy']<10 else cam['cy']

        try:
            xys,depths,radii,conics,comp,num_tiles_hit,_ = gsplat.project_gaussians(
                means3d=means, scales=torch.exp(log_scales), glob_scale=1.0,
                quats=quats/(quats.norm(dim=-1,keepdim=True)+1e-8),
                viewmat=w2c, fx=fx, fy=fy, cx=cx, cy=cy,
                img_height=H, img_width=W, block_width=16, clip_thresh=0.01,
            )
            if radii.sum()==0: continue

            bg = torch.rand(3,device=device) if it<D_UNTIL else torch.zeros(3,device=device)
            rendered,alpha,*_ = gsplat.rasterize_gaussians(
                xys=xys, depths=depths, radii=radii, conics=conics,
                num_tiles_hit=num_tiles_hit,
                colors=torch.sigmoid(colors),
                opacity=torch.sigmoid(opacities).unsqueeze(-1),
                img_height=H, img_width=W, block_width=16, background=bg,
            )
        except Exception as e:
            continue

        l1   = (rendered-gt).abs().mean()
        sreg = torch.exp(log_scales).mean()*0.01
        loss = l1+sreg
        psnr = -10*torch.log10(((rendered-gt)**2).mean()+1e-8)
        losses.append(l1.item()); psnrs.append(psnr.item())

        opt.zero_grad(); loss.backward()
        if means.grad is not None:
            if len(grad_acc)!=means.shape[0]:
                grad_acc=torch.zeros(means.shape[0],device=device)
            grad_acc+=means.grad.norm(dim=-1).detach()
        opt.step()

        # Densify
        if D_FROM<=it<D_UNTIL and it%D_EVERY==0 and means.shape[0]<MAX_GS:
            with torch.no_grad():
                if len(grad_acc)==means.shape[0]:
                    n2add = min(4000, means.shape[0])
                    _,idx2 = torch.topk(grad_acc, n2add)
                    mask = torch.zeros_like(grad_acc,dtype=torch.bool)
                    mask[idx2]=True
                    n=mask.sum().item()
                    if n>0 and means.shape[0]+n<MAX_GS:
                        noise=torch.randn_like(means[mask])*torch.exp(log_scales[mask]).mean(dim=-1,keepdim=True)*0.5
                        means     =torch.nn.Parameter(torch.cat([means.data,means[mask]+noise]))
                        log_scales=torch.nn.Parameter(torch.cat([log_scales.data,log_scales[mask]-0.2]))
                        quats     =torch.nn.Parameter(torch.cat([quats.data,quats[mask].detach()]))
                        opacities =torch.nn.Parameter(torch.cat([opacities.data,opacities[mask].detach()]))
                        colors    =torch.nn.Parameter(torch.cat([colors.data,colors[mask].detach()]))
                        grad_acc  =torch.zeros(means.shape[0],device=device)
                        opt=make_opt(lr)

        # Prune
        if D_FROM<=it<D_UNTIL and it%P_EVERY==0:
            with torch.no_grad():
                keep=(torch.sigmoid(opacities)>0.005)&(torch.exp(log_scales).max(dim=-1).values<0.5)
                if keep.sum()>100 and keep.sum()<means.shape[0]:
                    means     =torch.nn.Parameter(means.data[keep])
                    log_scales=torch.nn.Parameter(log_scales.data[keep])
                    quats     =torch.nn.Parameter(quats.data[keep])
                    opacities =torch.nn.Parameter(opacities.data[keep])
                    colors    =torch.nn.Parameter(colors.data[keep])
                    grad_acc  =torch.zeros(means.shape[0],device=device)
                    opt=make_opt(lr)

        if (it+1)%LOG==0:
            avg_psnr=np.mean(psnrs[-LOG:])
            print(f"Step {it+1:6d} | PSNR {avg_psnr:.1f}dB | GS {means.shape[0]:,}", flush=True)

    # Export
    with torch.no_grad():
        m=means.detach().cpu().numpy()
        s=torch.exp(log_scales).detach().cpu().numpy()
        q=(quats/(quats.norm(dim=-1,keepdim=True)+1e-8)).detach().cpu().numpy()
        o=torch.sigmoid(opacities).detach().cpu().numpy()
        c=torch.sigmoid(colors).detach().cpu().numpy()

    keep=(s.max(axis=1)<0.15)&(o>0.02)
    m,s,q,o,c=m[keep],s[keep],q[keep],o[keep],c[keep]
    m-=m.mean(axis=0)
    mf=m.copy(); mf[:,1]=-m[:,1]; mf[:,2]=-m[:,2]
    qf=q.copy(); qf[:,2]=-q[:,2]; qf[:,3]=-q[:,3]
    N2=len(mf)

    dtype=[('x','f4'),('y','f4'),('z','f4'),
           ('scale_0','f4'),('scale_1','f4'),('scale_2','f4'),
           ('rot_0','f4'),('rot_1','f4'),('rot_2','f4'),('rot_3','f4'),
           ('opacity','f4'),('f_dc_0','f4'),('f_dc_1','f4'),('f_dc_2','f4')]
    v=np.zeros(N2,dtype=dtype)
    v['x']=mf[:,0];v['y']=mf[:,1];v['z']=mf[:,2]
    v['scale_0']=s[:,0];v['scale_1']=s[:,1];v['scale_2']=s[:,2]
    v['rot_0']=qf[:,0];v['rot_1']=qf[:,1];v['rot_2']=qf[:,2];v['rot_3']=qf[:,3]
    v['opacity']=o;v['f_dc_0']=c[:,0];v['f_dc_1']=c[:,1];v['f_dc_2']=c[:,2]

    PlyData([PlyElement.describe(v,'vertex')]).write(args.output)
    print(f"✅ Exported {N2:,} Gaussians to {args.output}", flush=True)

if __name__=="__main__":
    main()
