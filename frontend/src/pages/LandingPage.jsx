import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'

export default function LandingPage() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white">

      {/* Navbar */}
      <nav className="fixed top-0 w-full z-50 flex items-center justify-between
                      px-8 py-4 backdrop-blur-md bg-black/40 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600" />
          <span className="text-lg font-bold tracking-tight">Inspira</span>
        </div>
        <button
          onClick={() => navigate('/upload')}
          className="px-5 py-2 rounded-lg bg-blue-600 hover:bg-blue-500
                     text-sm font-semibold transition-all duration-200"
        >
          Try it free
        </button>
      </nav>

      {/* Hero */}
      <section className="relative flex flex-col items-center justify-center
                          min-h-screen text-center px-6 pt-20">

        {/* Background glow */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2
                          w-[500px] h-[500px] rounded-full bg-blue-600/15 blur-[100px]" />
          <div className="absolute top-2/3 left-1/4
                          w-[300px] h-[300px] rounded-full bg-purple-600/10 blur-[80px]" />
        </div>

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7 }}
          className="relative z-10 max-w-3xl"
        >
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full
                          bg-blue-500/10 border border-blue-500/25 text-blue-400
                          text-xs font-medium mb-10 tracking-wide">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
            Powered by 3D Gaussian Splatting
          </div>

          {/* Headline */}
          <h1 className="text-5xl md:text-6xl font-extrabold leading-[1.1]
                         tracking-tight mb-6">
            <span className="text-white">Turn design inspiration</span>
            <br />
            <span className="bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400
                             bg-clip-text text-transparent">
              into your actual room.
            </span>
          </h1>

          {/* Subheadline */}
          <p className="text-lg text-gray-400 max-w-xl mx-auto mb-10 leading-relaxed">
            Upload a Pinterest photo. Take 20 photos of your room.
            Inspira reconstructs your space in 3D and shows you
            exactly how that design fits — before you spend a rupee.
          </p>

          {/* CTA buttons */}
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => navigate('/upload')}
              className="px-7 py-3.5 rounded-xl
                         bg-gradient-to-r from-blue-600 to-purple-600
                         hover:from-blue-500 hover:to-purple-500
                         text-base font-semibold transition-all duration-200
                         shadow-lg shadow-blue-500/20"
            >
              Try Inspira Free →
            </motion.button>
            <button
              className="px-7 py-3.5 rounded-xl
                         bg-white/5 hover:bg-white/10
                         border border-white/15 hover:border-white/30
                         text-gray-300 hover:text-white
                         text-base font-medium transition-all duration-200"
            >
              Watch demo ▶
            </button>
          </div>

          {/* Social proof */}
          <p className="mt-8 text-xs text-gray-600">
            Built on CLIP · LLaVA · 3DGS · Grounded-SAM · Depth Anything V2
          </p>
        </motion.div>

        {/* Scroll indicator */}
        <motion.div
          animate={{ y: [0, 6, 0] }}
          transition={{ repeat: Infinity, duration: 2.5 }}
          className="absolute bottom-10 text-gray-600 text-xs
                     flex flex-col items-center gap-1"
        >
          <span>scroll</span>
          <span>↓</span>
        </motion.div>
      </section>

      {/* How it works */}
      <section className="py-28 px-6">
        <div className="max-w-5xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <p className="text-xs font-semibold uppercase tracking-widest
                          text-blue-400 mb-3">
              How it works
            </p>
            <h2 className="text-3xl font-bold text-white mb-3">
              From saved image to furnished room
            </h2>
            <p className="text-gray-500 max-w-lg mx-auto">
              Three steps. No designer needed. No guesswork.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                step: "01", icon: "🖼️",
                title: "Upload your inspiration",
                desc: "Any Pinterest or Instagram design photo. We detect furniture, extract the colour palette, and identify the interior style automatically.",
                border: "border-blue-500/20",
                glow: "bg-blue-500/5",
              },
              {
                step: "02", icon: "📸",
                title: "Photograph your room",
                desc: "Take 15–20 overlapping photos of your room. Our 3D Gaussian Splatting pipeline reconstructs the true geometry of your space.",
                border: "border-purple-500/20",
                glow: "bg-purple-500/5",
              },
              {
                step: "03", icon: "✨",
                title: "Explore in 3D",
                desc: "Walk through your room as it would look in the inspiration style. Every piece of furniture is scaled to your actual dimensions.",
                border: "border-pink-500/20",
                glow: "bg-pink-500/5",
              },
            ].map((item, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
                viewport={{ once: true }}
                className={`p-7 rounded-2xl ${item.glow}
                            border ${item.border}`}
              >
                <div className="text-4xl mb-5">{item.icon}</div>
                <div className="text-xs font-mono text-gray-600 mb-2">
                  Step {item.step}
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">
                  {item.title}
                </h3>
                <p className="text-gray-500 text-sm leading-relaxed">
                  {item.desc}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Problem statement */}
      <section className="py-20 px-6 border-t border-white/5">
        <div className="max-w-3xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            viewport={{ once: true }}
          >
            <h2 className="text-3xl font-bold mb-6">
              450 million people save design inspiration every month.
              <span className="text-gray-500"> Almost none recreate it.</span>
            </h2>
            <p className="text-gray-500 leading-relaxed mb-8">
              The gap between a saved Pinterest photo and your actual room
              has always been impossible to bridge — until now. Inspira uses
              the same 3D perception technology powering Boston Dynamics and
              Figure AI robots, applied to a problem anyone with a home faces.
            </p>
            <button
              onClick={() => navigate('/upload')}
              className="px-7 py-3.5 rounded-xl bg-white text-black
                         font-semibold hover:bg-gray-100 transition-all duration-200"
            >
              See it in action →
            </button>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-10 px-6 border-t border-white/5
                         flex items-center justify-between text-gray-600 text-xs">
        <span>© 2026 Inspira</span>
        <span>Computer Vision Research Project</span>
        <span>Built with 3DGS + CLIP + LLaVA</span>
      </footer>

    </div>
  )
}
