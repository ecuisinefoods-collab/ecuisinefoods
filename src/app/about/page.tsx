import Link from "next/link";
import { ArrowRight, Heart, Leaf, ShieldCheck, Sparkles, Sprout } from "lucide-react";
import { SiteHeader } from "@/components/site-header";

const values = [
  {
    icon: Leaf,
    title: "Thoughtful food choices",
    description: "We want choosing food to feel clearer and more considered, with useful product information to help customers make their own decisions."
  },
  {
    icon: ShieldCheck,
    title: "Trust in every interaction",
    description: "From clear prices and order updates to helpful customer support, we aim to make every step straightforward and dependable."
  },
  {
    icon: Sprout,
    title: "Always growing",
    description: "We keep learning, improving and expanding our range as we work towards bringing more food choices to more communities."
  }
];

export default function AboutPage() {
  return (
    <main className="min-h-screen overflow-hidden bg-[#fffdf8] text-[#21382b]">
      <div className="bg-[#087f5b] px-4 py-2.5 text-center text-[11px] font-extrabold tracking-[.1em] text-white">
        GOOD FOOD · BETTER LIVING
      </div>
      <SiteHeader />

      <section className="relative isolate overflow-hidden bg-[#eff6e9]">
        <div className="pointer-events-none absolute -right-24 -top-28 h-80 w-80 rounded-full bg-[#f7d66a]/40 blur-2xl" />
        <div className="pointer-events-none absolute -bottom-36 -left-24 h-80 w-80 rounded-full bg-[#b8d9a9]/50 blur-2xl" />
        <div className="relative mx-auto grid max-w-7xl items-center gap-10 px-5 py-16 sm:py-24 lg:grid-cols-[1.15fr_.85fr] lg:py-28">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-[#c9ddc5] bg-white/75 px-4 py-2 text-[10px] font-black uppercase tracking-[.18em] text-[#087f5b]">
              <Sparkles size={14} /> The heart of eCuisinefoods
            </span>
            <h1 className="mt-6 max-w-3xl text-5xl font-black leading-[1.02] tracking-[-.055em] text-[#173e2d] sm:text-6xl lg:text-7xl">
              Good food.<br /><span className="text-[#e5a91b]">Better living.</span>
            </h1>
            <p className="mt-6 max-w-2xl text-base leading-8 text-[#526457] sm:text-lg">
              We believe food is part of everyday wellbeing. eCuisinefoods is building a food brand around thoughtful choices, useful information and a shopping experience people can feel good about.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/shop" className="inline-flex items-center gap-3 rounded-xl bg-[#087f5b] px-6 py-4 text-sm font-extrabold text-white shadow-lg shadow-[#087f5b]/15 transition hover:-translate-y-0.5 hover:bg-[#07543f]">
                Explore the shop <ArrowRight size={17} />
              </Link>
              <Link href="/contact" className="inline-flex items-center gap-2 rounded-xl border border-[#cbdacb] bg-white px-6 py-4 text-sm font-extrabold text-[#245b42] transition hover:bg-[#f8fbf5]">
                Get in touch
              </Link>
            </div>
          </div>

          <div className="relative mx-auto w-full max-w-md">
            <div className="absolute -inset-3 rotate-3 rounded-[2.5rem] bg-[#f3c84b]" />
            <div className="relative overflow-hidden rounded-[2.2rem] border border-white/80 bg-white p-7 shadow-xl sm:p-9">
              <div className="grid h-16 w-16 place-items-center rounded-2xl bg-[#087f5b] text-[#fff0a8]">
                <Heart size={31} fill="currentColor" />
              </div>
              <p className="mt-8 text-xs font-black uppercase tracking-[.18em] text-[#b17a12]">Our belief</p>
              <p className="mt-3 text-2xl font-black leading-snug tracking-tight text-[#173e2d] sm:text-3xl">
                Every family deserves food choices they can understand and a brand they can trust.
              </p>
              <div className="mt-8 h-1.5 w-20 rounded-full bg-[#f3c84b]" />
              <p className="mt-4 text-xs font-bold text-[#7b897d]">eCuisinefoods · Good food, better living</p>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-8 px-5 py-16 sm:py-20 lg:grid-cols-[.8fr_1.2fr] lg:gap-16">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[.2em] text-[#b17a12]">Who we are</p>
          <h2 className="mt-3 text-3xl font-black leading-tight tracking-tight text-[#173e2d] sm:text-4xl">A food brand with purpose at its heart.</h2>
        </div>
        <div className="space-y-5 text-sm leading-8 text-[#5a6b5e] sm:text-base">
          <p>
            The name eCuisine reflects our interest in food that is useful, considered and connected to better everyday living. We are building the brand with a simple idea: customers should be able to discover products, understand the information available about them and shop with confidence.
          </p>
          <p>
            Our journey is growing from our presence in Jos and Bauchi. We are focused on making it easier for customers to find our products and collect their orders through convenient local pickup points, while continuing to develop the range and the experience around it.
          </p>
          <p>
            We are still growing, and that is part of our story. Every product we introduce and every improvement we make is an opportunity to serve customers better.
          </p>
        </div>
      </section>

      <section className="bg-[#f5f8f1] py-16 sm:py-20">
        <div className="mx-auto max-w-7xl px-5">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-[11px] font-black uppercase tracking-[.2em] text-[#b17a12]">What guides us</p>
            <h2 className="mt-3 text-3xl font-black tracking-tight text-[#173e2d] sm:text-4xl">The values behind the name</h2>
            <p className="mt-4 text-sm leading-7 text-[#718074]">The principles we want customers to experience whenever they meet eCuisinefoods.</p>
          </div>
          <div className="mt-10 grid gap-4 md:grid-cols-3">
            {values.map(({ icon: Icon, title, description }, index) => (
              <article key={title} className="rounded-3xl border border-[#e3ebdf] bg-white p-7 shadow-sm transition hover:-translate-y-1 hover:shadow-lg">
                <span className={`grid h-12 w-12 place-items-center rounded-2xl ${index === 1 ? "bg-[#fff3c9] text-[#a66c00]" : "bg-[#e8f4e8] text-[#087f5b]"}`}>
                  <Icon size={23} />
                </span>
                <h3 className="mt-6 text-lg font-black text-[#173e2d]">{title}</h3>
                <p className="mt-3 text-sm leading-7 text-[#718074]">{description}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-16 sm:py-20">
        <div className="overflow-hidden rounded-[2rem] bg-[#173e2d] px-7 py-10 text-center text-white sm:px-12 sm:py-14">
          <span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-white/10 text-[#f3c84b]"><Sprout size={24} /></span>
          <p className="mt-5 text-[10px] font-black uppercase tracking-[.2em] text-[#f3d46f]">Growing with you</p>
          <h2 className="mx-auto mt-3 max-w-2xl text-3xl font-black tracking-tight sm:text-4xl">Thank you for being part of our story.</h2>
          <p className="mx-auto mt-4 max-w-xl text-sm leading-7 text-white/75">Whether you are discovering us for the first time or shopping with us again, we are glad you are here.</p>
          <Link href="/shop" className="mt-7 inline-flex items-center gap-3 rounded-xl bg-[#f3c84b] px-6 py-4 text-sm font-black text-[#173e2d] transition hover:-translate-y-0.5 hover:bg-[#ffdc70]">
            Shop eCuisinefoods <ArrowRight size={17} />
          </Link>
        </div>
      </section>
    </main>
  );
}
