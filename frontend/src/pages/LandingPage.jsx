import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'

export default function LandingPage() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white">

      {/* Navbar */}
      <nav className="fixed top-0 w-full z-50 flex items-center justify-between
                      px-8 py-4 backdrop-blur-md bg-black/30 border-b border-white/10">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600" />
          <span className="text-xl font-bold tracking-tight">Inspira</span>
        </div>
        <button
          onClick={() => navigate('/upload')}
          className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500
                     text-sm font-medium transition-all duration-200"
        >
          Try it free
        </button>
      </nav>

      {/* Hero */}
      <section className="relative flex flex-col items-center justify-center
                          min-h-screen text-center px-6 pt-20">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2
                          w-[600px] h-[600px] rounded-full bg-blue-600/20 blur-[120px]" />
          <div className="absolute top-1/2 left-1/3
                          w-[400px] h-[400px] rounded-full bg-purple-600/15 blur-[100px]" />
        </div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="relative z-10 max-w-4xl"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full
                          bg-blue-500/10 border border-blue-500/30 text-blue-400
                          text-sm font-medium mb-8">
            <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
            Powered by 3D Gaussian Splatting
          </div>

          <h1 className="text-6xl md:text-7xl font-extrabold leading-tight mb-6 tracking-tight">
            See your room
            <span className="block bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400
                             bg-clip-text text-transparent">
              the way a designer does.
            </span>
          </h1>

          <p className="text-xl text-gray-400 max-w-2xl mx-auto mb-10 leading-relaxed">
            Upload any Pinterest inspiration. Upload photos of your room.
            Inspira reconstructs your space in 3D and shows you exactly
            how that design would look — before you buy anything.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => navigate('/upload')}
              className="px-8 py-4 rounded-xl bg-gradient-to-r from-blue-600 to-purple-600
                         hover:from-blue-500 hover:to-purple-500
                         text-lg font-semibold transition-all duration-200
                         shadow-lg shadow-blue-500/25"
            >
              Try Inspira Free →
            </motion.button>
            <button className="px-8 py-4 rounded-xl border border-white/20
                               hover:border-white/40 text-gray-300 hover:text-white
                               text-lg font-medium transition-all duration-200">
              Watch demo
            </button>
          </div>
        </motion.div>

        <motion.div
          animate={{ y: [0, 8, 0] }}
          transition={{ repeat: Infinity, duration: 2 }}
          className="absolute bottom-8 text-gray-600 text-sm flex flex-col items-center gap-2"
        >
          <span>Scroll to learn more</span>
          <span>↓</span>
        </motion.div>
      </section>

      {/* How it works */}
      <section className="py-32 px-6">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center mb-20"
          >
            <h2 className="text-4xl font-bold mb-4">How Inspira works</h2>
            <p className="text-gray-400 text-lg max-w-2xl mx-auto">
              Three steps from inspiration to your actual room — in 3D.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                step: "01", icon: "🖼️",
                title: "Upload your inspiration",
                desc: "Any Pinterest screenshot or design photo. AI detects every piece of furniture, extracts the style, and reads the colour palette.",
                color: "from-blue-500/20 to-blue-600/5",
                border: "border-blue-500/30",
              },
              {
                step: "02", icon: "📸",
                title: "Scan your room",
                desc: "Take 15-20 photos from different angles. Our 3D Gaussian Splatting pipeline reconstructs your exact space with true geometry.",
                color: "from-purple-500/20 to-purple-600/5",
                border: "border-purple-500/30",
              },
              {
                step: "03", icon: "🏠",
                title: "See the result in 3D",
                desc: "Walk through your room furnished in the inspiration style. Every piece correctly scaled to your actual dimensions.",
                color: "from-pink-500/20 to-pink-600/5",
                border: "border-pink-500/30",
              },
            ].map((item, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: i * 0.15 }}
                className={`p-8 rounded-2xl bg-gradient-to-b ${item.color}
                            border ${item.border} backdrop-blur-sm`}
              >
                <div className="text-5xl mb-6">{item.icon}</div>
                <div className="text-sm font-mono text-gray-500 mb-2">{item.step}</div>
                <h3 className="text-xl font-bold mb-3">{item.title}</h3>
                <p className="text-gray-400 leading-relaxed">{item.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Tech stack */}
      <section className="py-20 px-6 border-t border-white/5">
        <div className="max-w-4xl mx-auto text-center">
          <p className="text-gray-500 text-sm font-medium uppercase tracking-widest mb-8">
            Built on cutting-edge computer vision research
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            {["3D Gaussian Splatting","CLIP Vision-Language","Grounded-SAM",
              "Depth Anything V2","LLaVA 7B","Three.js WebGL"].map((tech, i) => (
              <span key={i} className="px-4 py-2 rounded-full bg-white/5 border border-white/10
                                       text-gray-400 text-sm font-medium">
                {tech}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-6 border-t border-white/5 text-center text-gray-600 text-sm">
        <p>Inspira — Computer Vision Research Project · Built with ❤️ and 3DGS</p>
      </footer>
    </div>
  )
}
