"use client";

import { Suspense, useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Link2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

const schema = z.object({
  email: z.string().email("Email inválido"),
  password: z.string().min(1, "Senha obrigatória"),
});

type FormData = z.infer<typeof schema>;

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <path
        d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z"
        fill="#4285F4"
      />
      <path
        d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z"
        fill="#34A853"
      />
      <path
        d="M3.964 10.71A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 000 9c0 1.452.348 2.827.957 4.042l3.007-2.332z"
        fill="#FBBC05"
      />
      <path
        d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z"
        fill="#EA4335"
      />
    </svg>
  );
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") ?? "/dashboard";

  const [loadingCredentials, setLoadingCredentials] = useState(false);
  const [loadingGoogle, setLoadingGoogle] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  async function onSubmit(data: FormData) {
    setLoadingCredentials(true);
    const result = await signIn("credentials", {
      email: data.email,
      password: data.password,
      redirect: false,
    });
    setLoadingCredentials(false);

    if (result?.error) {
      toast.error("Email ou senha incorretos");
    } else {
      router.push(callbackUrl);
    }
  }

  async function handleGoogleSignIn() {
    setLoadingGoogle(true);
    await signIn("google", { callbackUrl });
  }

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-8 space-y-5">
      <div>
        <h1 className="text-lg font-semibold text-zinc-100">Acessar plataforma</h1>
        <p className="text-sm text-zinc-400 mt-1">
          Entre com Google ou use seu email e senha
        </p>
      </div>

      {/* Google SSO */}
      <Button
        type="button"
        variant="outline"
        className="w-full flex items-center gap-3 bg-zinc-800 border-zinc-700 text-zinc-100 hover:bg-zinc-700 hover:text-white"
        onClick={handleGoogleSignIn}
        disabled={loadingGoogle}
      >
        {loadingGoogle ? (
          <Loader2 size={16} className="animate-spin" />
        ) : (
          <GoogleIcon />
        )}
        Entrar com Google
      </Button>

      {/* Divisor */}
      <div className="flex items-center gap-3">
        <div className="flex-1 h-px bg-zinc-800" />
        <span className="text-xs text-zinc-500">ou continue com email</span>
        <div className="flex-1 h-px bg-zinc-800" />
      </div>

      {/* Formulário email/senha */}
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="email" className="text-zinc-300 text-sm">
            Email
          </Label>
          <Input
            id="email"
            type="email"
            placeholder="seu@email.com"
            className="bg-zinc-800 border-zinc-700 text-zinc-100 placeholder:text-zinc-500"
            {...register("email")}
          />
          {errors.email && (
            <p className="text-xs text-red-400">{errors.email.message}</p>
          )}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="password" className="text-zinc-300 text-sm">
            Senha
          </Label>
          <Input
            id="password"
            type="password"
            placeholder="••••••••"
            className="bg-zinc-800 border-zinc-700 text-zinc-100 placeholder:text-zinc-500"
            {...register("password")}
          />
          {errors.password && (
            <p className="text-xs text-red-400">{errors.password.message}</p>
          )}
        </div>

        <Button
          type="submit"
          disabled={loadingCredentials}
          className="w-full bg-violet-600 hover:bg-violet-500 text-white"
        >
          {loadingCredentials ? (
            <Loader2 size={15} className="animate-spin mr-2" />
          ) : null}
          Entrar
        </Button>
      </form>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-950">
      <div className="w-full max-w-sm px-4">
        {/* Logo */}
        <div className="flex items-center justify-center gap-2 mb-8">
          <div className="w-9 h-9 bg-violet-600 rounded-lg flex items-center justify-center">
            <Link2 size={18} className="text-white" />
          </div>
          <span className="text-xl font-semibold text-white">UTM Base Control</span>
        </div>

        <Suspense fallback={<div className="bg-zinc-900 border border-zinc-800 rounded-xl p-8 h-64 animate-pulse" />}>
          <LoginForm />
        </Suspense>

        <p className="text-center text-xs text-zinc-600 mt-6">
          UTM Base Control v1
        </p>
      </div>
    </div>
  );
}
