"use client"

import { useState } from "react"
import { getSupabaseBrowserClient } from "@/lib/supabase/client"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { motion } from "framer-motion"
import { useToast } from "@/hooks/use-toast"
import { Loader2, Eye, EyeOff } from "lucide-react"

export default function LoginPage() {
  const supabase = getSupabaseBrowserClient()
  const { toast } = useToast()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const params = useSearchParams()
  const redirect = params.get("redirect") || "/dashboard"
  const [showPassword, setShowPassword] = useState(false)

  async function handleSignIn(e?: React.FormEvent) {
    e?.preventDefault()
    if (loading) return

    try {
      setLoading(true)
      const { data, error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) throw error
      
      await supabase.auth.getSession()
      setTimeout(() => {
  toast({ title: "Welcome back!" })
}, 600)
      router.replace(redirect)
      // do not clear loading here; component will unmount on navigation
      return
    } catch (e: any) {
      const msg = e?.message || 'Something went wrong'
      toast({ title: "Login failed", description: msg, variant: "destructive" })
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-sky-50 via-white to-sky-100 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 p-6 relative overflow-hidden">
      {/* Animated background blobs for effect */}
      <motion.div
        className="absolute top-[-100px] left-[-100px] w-[300px] h-[300px] bg-sky-300/40 rounded-full blur-3xl"
        animate={{ x: [0, 100, 0], y: [0, 50, 0] }}
        transition={{ duration: 10, repeat: Infinity }}
      />
      <motion.div
        className="absolute bottom-[-120px] right-[-80px] w-[280px] h-[280px] bg-blue-400/30 rounded-full blur-3xl"
        animate={{ x: [0, -80, 0], y: [0, -60, 0] }}
        transition={{ duration: 8, repeat: Infinity }}
      />

      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="w-full max-w-md relative z-10"
      >
        <form
          onSubmit={handleSignIn}
          className="glass shadow-2xl rounded-2xl md:rounded-3xl p-8 md:p-10 flex flex-col gap-3 border border-white/10 dark:border-white/10"
        >
          <div className="flex flex-col items-center mb-6">
            <h1 className="text-3xl font-bold text-center bg-gradient-to-r from-sky-500 to-blue-600 text-transparent bg-clip-text font-sans tracking-tight mb-0">
              Airmango Dashboard
            </h1>
            <p className="text-slate-500 dark:text-slate-400 text-center text-base mt-1 mb-0">Sign in to manage your trips</p>
          </div>
          <div className="space-y-5">
  {/* Email Field */}
  <div className="flex flex-col gap-2">
    <Label
      htmlFor="email"
      className="text-sm font-medium text-slate-600 dark:text-slate-300"
    >
      Email
    </Label>
    <Input
      id="email"
      type="email"
      value={email}
      onChange={(e) => setEmail(e.target.value)}
      placeholder="Enter your email"
      className="h-12 px-4 text-sm bg-white/80 dark:bg-slate-900/70 border border-slate-300/40 dark:border-slate-700/50 rounded-xl focus:ring-2 focus:ring-sky-400 focus:border-transparent shadow-sm transition-all focus:bg-white dark:focus:bg-slate-900"
      required
      autoComplete="email"
      autoFocus
    />
  </div>

  {/* Password Field */}
  <div className="flex flex-col gap-2">
    <Label
      htmlFor="password"
      className="text-sm font-medium text-slate-600 dark:text-slate-300"
    >
      Password
    </Label>
    <div className="relative">
      <Input
        id="password"
        type={showPassword ? "text" : "password"}
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="Enter your password"
        className="h-12 px-4 text-sm bg-white/80 dark:bg-slate-900/70 border border-slate-300/40 dark:border-slate-700/50 rounded-xl focus:ring-2 focus:ring-sky-400 focus:border-transparent shadow-sm transition-all focus:bg-white dark:focus:bg-slate-900 pr-12"
        required
        autoComplete="current-password"
      />
      <button
        type="button"
        className="absolute top-1/2 right-3 transform -translate-y-1/2 text-slate-400 hover:text-sky-500 focus-visible:text-sky-600 transition p-1 rounded-md outline-none"
        onClick={() => setShowPassword(v => !v)}
        aria-label={showPassword ? "Hide password" : "Show password"}
      >
        {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
      </button>
    </div>
  </div>

  {/* Forgot Password + Submit */}
  <div className="w-full flex justify-end -mt-3 mb-2">
    <button
      type="button"
      className="text-sky-600 dark:text-sky-400 text-sm font-medium hover:underline focus:underline transition-all px-2 outline-none"
      disabled
      aria-disabled="true"
      title="Password reset coming soon"
    >
      Forgot password?
    </button>
  </div>

  <Button
    type="submit"
    className="w-full h-12 rounded-xl font-semibold shadow focus:ring-2 focus:ring-offset-2 focus:ring-sky-300 bg-gradient-to-r from-sky-500 to-blue-600 dark:from-sky-600 dark:to-blue-600 hover:from-sky-600 hover:to-blue-700 dark:hover:from-sky-700 dark:hover:to-blue-700 text-white text-lg tracking-wide"
    size="lg"
    loading={loading}
    disabled={loading}
  >
    Sign In
  </Button>
</div>

        </form>
      </motion.div>
    </main>
  )
}
