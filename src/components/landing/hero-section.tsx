import { Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import {
  ArrowRight,
  Eye,
  Play,
  Zap,
  ShieldCheck,
} from "lucide-react";
import {
  useEffect,
  useState,
} from "react";

import logoManualStock from "@/assets/logo.png";
import imagemMecanico from "@/assets/logo.png";

type TrackingSearch = Record<
  string,
  string | undefined
>;

type HeroSectionProps = {
  plansSearch: TrackingSearch;
  loginSearch: TrackingSearch;

  onPlansClick: (
    ctaName: string,
    position: string,
  ) => Promise<void> | void;

  onLoginClick: (
    ctaName: string,
    position: string,
  ) => Promise<void> | void;
};

export function HeroSection({
  plansSearch,
  loginSearch,
  onPlansClick,
  onLoginClick,
}: HeroSectionProps) {
  const [playVideo, setPlayVideo] =
    useState(false);

  const [viewers, setViewers] =
    useState(127);

  useEffect(() => {
    const interval =
      window.setInterval(() => {
        setViewers(
          (current) => {
            const variation =
              Math.floor(
                Math.random() *
                  5,
              ) - 2;

            return Math.max(
              80,
              Math.min(
                180,
                current +
                  variation,
              ),
            );
          },
        );
      }, 3000);

    return () => {
      window.clearInterval(
        interval,
      );
    };
  }, []);

  function handlePlayVideo() {
    setPlayVideo(true);
  }

  return (
    <section className="relative flex min-h-[calc(100vh-4rem)] w-full min-w-0 items-center justify-center overflow-hidden bg-background">
      {/* Background */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-primary/10 via-transparent to-transparent" />

      <div className="pointer-events-none absolute left-1/2 top-[-10%] h-[400px] w-[800px] max-w-[95vw] -translate-x-1/2 rounded-full bg-primary/20 opacity-50 blur-[120px]" />

      <div className="pointer-events-none absolute inset-0 bg-grid opacity-30" />

      <div className="relative z-10 mx-auto w-full min-w-0 max-w-7xl px-4 py-10 sm:px-6 md:py-14">
        {/* Logo */}
        <motion.div
          initial={{
            opacity: 0,
            y: -15,
          }}
          animate={{
            opacity: 1,
            y: 0,
          }}
          transition={{
            duration: 0.5,
          }}
          className="mb-6 flex items-center justify-center gap-3 md:mb-8"
        >
          <img
            src={
              logoManualStock
            }
            alt="Manual Stock"
            className="h-[48px] w-[48px] shrink-0 object-contain md:h-[64px] md:w-[64px]"
          />

          <div className="min-w-0 text-left leading-none">
            <p className="truncate text-xl font-extrabold uppercase tracking-wide text-white md:text-3xl">
              Manual Stock
            </p>

            <p className="mt-1 truncate text-[10px] uppercase tracking-[0.22em] text-primary md:text-xs">
              Manuais técnicos
            </p>
          </div>
        </motion.div>

        {/* Headline */}
        <motion.h1
          initial={{
            opacity: 0,
            y: 15,
          }}
          animate={{
            opacity: 1,
            y: 0,
          }}
          transition={{
            delay: 0.1,
            duration: 0.55,
          }}
          className="mx-auto mb-6 max-w-6xl px-1 text-center text-[30px] font-black uppercase leading-[0.98] tracking-tight text-white sm:text-[42px] md:mb-8 md:text-[62px] lg:text-[76px]"
        >
          Mais de 3.500
          <br />

          <span className="text-primary">
            manuais direto da
            concessionária
          </span>

          <br />

          no seu celular
        </motion.h1>

        <motion.p
          initial={{
            opacity: 0,
            y: 12,
          }}
          animate={{
            opacity: 1,
            y: 0,
          }}
          transition={{
            delay: 0.18,
            duration: 0.5,
          }}
          className="mx-auto mb-8 max-w-2xl px-2 text-center text-sm leading-relaxed text-muted-foreground sm:text-base md:text-lg"
        >
          Manuais de serviço,
          esquemas elétricos,
          injeção eletrônica e
          catálogos de peças para
          mecânicos e oficinas.
        </motion.p>

        {/* VSL */}
        <motion.div
          initial={{
            opacity: 0,
            y: 35,
          }}
          animate={{
            opacity: 1,
            y: 0,
          }}
          transition={{
            duration: 0.65,
            delay: 0.25,
          }}
          className="mx-auto w-full min-w-0 px-0 sm:px-2 md:px-4"
        >
          <div className="glow-soft relative mx-auto w-full min-w-0 max-w-[900px] overflow-hidden rounded-2xl border border-primary/40 bg-black shadow-[0_0_50px_-12px_hsl(var(--primary)/0.5)]">
            <div className="relative aspect-video w-full">
              {!playVideo ? (
                <button
                  type="button"
                  onClick={
                    handlePlayVideo
                  }
                  aria-label="Reproduzir vídeo de apresentação"
                  className="group absolute inset-0 h-full w-full overflow-hidden text-left"
                >
                  <img
                    src={
                      imagemMecanico
                    }
                    alt="Apresentação do Manual Stock"
                    className="absolute inset-0 h-full w-full object-cover object-center"
                    loading="eager"
                    fetchPriority="high"
                  />

                  <span className="absolute inset-0 bg-black/45 transition-colors group-hover:bg-black/30" />

                  <span className="absolute inset-0 flex items-center justify-center">
                    <span className="flex h-16 w-16 items-center justify-center rounded-full bg-primary shadow-2xl transition duration-300 group-hover:scale-110 md:h-24 md:w-24">
                      <Play className="ml-1 h-8 w-8 fill-white text-white md:h-12 md:w-12" />
                    </span>
                  </span>

                  <span className="absolute bottom-4 left-1/2 max-w-[90%] -translate-x-1/2 rounded-full border border-white/15 bg-black/60 px-4 py-2 text-center text-xs font-medium text-white backdrop-blur">
                    Assista e veja como funciona
                  </span>
                </button>
              ) : (
                <iframe
                  src="https://fast.wistia.net/embed/iframe/y5ym6khaaz?autoplay=1"
                  title="Apresentação Manual Stock"
                  allow="autoplay; fullscreen"
                  allowFullScreen
                  frameBorder="0"
                  scrolling="no"
                  className="absolute inset-0 h-full w-full"
                />
              )}
            </div>
          </div>
        </motion.div>

        {/* Contador */}
        <motion.div
          initial={{
            opacity: 0,
          }}
          animate={{
            opacity: 1,
          }}
          transition={{
            delay: 0.8,
          }}
          className="mt-5 flex items-center justify-center gap-2 text-[13px] text-gray-300 md:text-base"
        >
          <span className="relative flex h-2.5 w-2.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-70" />

            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-primary" />
          </span>

          <Eye className="h-4 w-4 text-primary" />

          <span>
            <strong className="text-white">
              {viewers}
            </strong>{" "}
            pessoas assistindo agora
          </span>
        </motion.div>

        {/* CTAs */}
        <motion.div
          initial={{
            opacity: 0,
            y: 20,
          }}
          animate={{
            opacity: 1,
            y: 0,
          }}
          transition={{
            delay: 0.45,
            duration: 0.5,
          }}
          className="mt-8 flex flex-col items-center justify-center gap-3 md:mt-10 sm:flex-row"
        >
          <Link
            to="/planos"
            search={
              plansSearch as never
            }
            onClick={() =>
              void onPlansClick(
                "Quero entrar agora",
                "hero_vsl",
              )
            }
            className="glow inline-flex w-full items-center justify-center gap-2 rounded-full bg-primary px-8 py-4 text-sm font-bold uppercase tracking-wide text-primary-foreground transition hover:scale-[1.03] hover:opacity-95 active:scale-95 sm:w-auto"
          >
            Quero entrar agora

            <ArrowRight className="h-4 w-4" />
          </Link>

          <Link
            to="/auth"
            search={
              loginSearch as never
            }
            onClick={() =>
              void onLoginClick(
                "Já sou assinante",
                "hero_vsl",
              )
            }
            className="inline-flex w-full items-center justify-center rounded-full border border-border bg-card/60 px-8 py-4 text-sm font-medium text-foreground backdrop-blur transition hover:border-primary/40 hover:bg-card sm:w-auto"
          >
            Já sou assinante
          </Link>
        </motion.div>

        {/* Microprova */}
        <motion.div
          initial={{
            opacity: 0,
          }}
          animate={{
            opacity: 1,
          }}
          transition={{
            delay: 0.65,
          }}
          className="mt-6 flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-center text-xs text-gray-400 md:text-sm"
        >
          <span className="inline-flex items-center gap-1.5">
            <Zap className="h-3.5 w-3.5 text-primary" />
            Acesso imediato
          </span>

          <span className="inline-flex items-center gap-1.5">
            <ShieldCheck className="h-3.5 w-3.5 text-primary" />
            Pagamento seguro
          </span>

          <span>
            Uso profissional
          </span>
        </motion.div>
      </div>
    </section>
  );
}

export default HeroSection;

