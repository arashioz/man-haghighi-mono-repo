import React, { useMemo, useState } from 'react';
import { motion, type Variants } from 'framer-motion';
import { useNavigate } from 'react-router-dom';

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.7 } },
} satisfies Variants;

const stagger = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.12, delayChildren: 0.06 } },
} satisfies Variants;

const CONTACT_PHONE_DISPLAY = '021-91690112';
const CONTACT_PHONE_TEL = '+982191690112';

const Contact: React.FC = () => {
  const navigate = useNavigate();

  const assets = useMemo(
    () => ({
      hero: '/assets/sliders/Header-Site-1.jpg',
      faraz: '/assets/faraz.jpg',
      gallery: [
        '/assets/seminar-photo/DSC_0514.jpg',
        '/assets/seminar-photo/IMG_4675.JPG',
        '/assets/seminar-photo/IMG_1532.jpg',
        '/assets/seminar-photo/DSC00117.jpg',
      ],
    }),
    [],
  );

  const [form, setForm] = useState({ name: '', phone: '', message: '' });
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      // فعلاً فرم صرفاً نمایشی است (API برای ارسال پیام در پروژه تعریف نشده)
      await new Promise((r) => setTimeout(r, 500));
      alert('پیام شما دریافت شد. کارشناسان ما به‌زودی با شما تماس می‌گیرند.');
      setForm({ name: '', phone: '', message: '' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white" dir="rtl" data-version2="true">
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0">
          <img src={assets.hero} alt="تماس با ما" className="h-full w-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/55 to-[#0a0a0a]" />
        </div>

        <div className="relative mx-auto max-w-6xl px-4 pb-12 pt-14 sm:px-8 sm:pb-16 sm:pt-20">
          <motion.div variants={stagger} initial="hidden" animate="visible" className="space-y-6">
            <motion.p
              variants={fadeUp}
              className="text-sm font-semibold uppercase tracking-[0.5em] text-yellow-400"
            >
              ارتباط با ما
            </motion.p>
            <motion.h1 variants={fadeUp} className="text-4xl font-black sm:text-5xl lg:text-6xl text-right">
              در مسیر رشد و معنا، کنار شما هستیم
            </motion.h1>
            <motion.p variants={fadeUp} className="max-w-3xl text-lg text-white/80 text-right">
              برای ارتباط با کارشناسان حرفه‌ای آموزش‌دیده توسط استاد فراز قورچیان، از طریق راه‌های ارتباطی زیر با ما
              در تماس باشید.
            </motion.p>

            <motion.div variants={fadeUp} className="flex flex-wrap gap-4">
              <a
                href={`tel:${CONTACT_PHONE_TEL}`}
                className="rounded-full bg-gradient-to-r from-yellow-400 via-yellow-500 to-yellow-600 px-8 py-3 text-sm font-semibold uppercase tracking-widest text-black shadow-[0_25px_60px_-20px_rgba(250,204,21,0.8)] transition hover:scale-105"
              >
                تماس مستقیم · {CONTACT_PHONE_DISPLAY}
              </a>
              <button
                onClick={() => navigate('/about')}
                className="rounded-full border border-white/30 px-8 py-3 text-sm font-semibold uppercase tracking-widest text-white transition hover:border-white hover:bg-white/10"
              >
                فراز قورچیان · درباره موسس
              </button>
            </motion.div>
          </motion.div>
        </div>
      </section>

      <main className="mx-auto w-full max-w-6xl px-4 pb-16 sm:px-8">
        {/* About institute */}
        <section className="border-t border-white/10 py-12 sm:py-16">
          <div className="grid gap-10 lg:grid-cols-2 lg:items-start">
            <motion.div
              variants={stagger}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, amount: 0.25 }}
              className="space-y-6"
            >
              <motion.h2 variants={fadeUp} className="text-3xl font-bold sm:text-4xl text-right">
                موسسه آموزشی پیشگامان من حقیقی
              </motion.h2>

              <motion.div
                variants={fadeUp}
                className="rounded-[32px] border border-white/10 bg-white/5 p-7 backdrop-blur"
              >
                <p className="text-white/80 leading-relaxed text-right">
                  موسسه آموزشی من حقیقی به مدت هشت سال است که فعالیت‌های خود را در زمینه‌های آموزش معنا و رشد
                  و توسعه‌ی فردی آغاز کرده است. این موسسه به مدیریت جناب آقای فراز قورچیان، در این مدت با برگزاری موفقیت‌آمیز
                  بیش از دو هزار کارگاه آموزشی در زمینه‌های مختلف خودشناسی، ناخودآگاه، روابط عاطفی و روابط مالی مخاطبان
                  بسیاری را از نقاط مختلف ایران و جهان پذیرا بوده است.
                </p>
                <p className="mt-5 text-white/80 leading-relaxed text-right">
                  تا کنون بیش از دویست هزار نفر شرکت‌کننده از خدمات آموزشی این مجموعه بهره‌مند شده‌اند. دستیابی به نتایج
                  شگفت‌انگیز و تغییرات مثبت چشمگیر در رشد و توسعه‌ی فردی و سلامت جسمی و روانی در شرکت‌کنندگان از افتخارات
                  کاری این مجموعه است.
                </p>
              </motion.div>

              <motion.div variants={fadeUp} className="grid gap-4 sm:grid-cols-3">
                <div className="rounded-3xl border border-white/10 bg-white/5 p-6 text-center backdrop-blur">
                  <p className="text-3xl font-black text-yellow-400">8+</p>
                  <p className="mt-2 text-xs uppercase tracking-[0.35em] text-white/60">سال فعالیت</p>
                </div>
                <div className="rounded-3xl border border-white/10 bg-white/5 p-6 text-center backdrop-blur">
                  <p className="text-3xl font-black text-yellow-400">2000+</p>
                  <p className="mt-2 text-xs uppercase tracking-[0.35em] text-white/60">کارگاه آموزشی</p>
                </div>
                <div className="rounded-3xl border border-white/10 bg-white/5 p-6 text-center backdrop-blur">
                  <p className="text-3xl font-black text-yellow-400">200K+</p>
                  <p className="mt-2 text-xs uppercase tracking-[0.35em] text-white/60">شرکت‌کننده</p>
                </div>
              </motion.div>

              <motion.div variants={fadeUp} className="rounded-[32px] border border-white/10 bg-[#0a0a0a] p-7">
                <p className="text-white/80 leading-relaxed text-right">
                  علاوه بر آن، موسسه آموزشی من حقیقی مفتخر است که با برگزاری همایش‌ها و سمینارهای عمومی در مناسبت‌های
                  مختلف ملی و مذهبی برای عموم مردم، در زمینه‌ی آگاهی‌بخشی و سلامت جامعه‌ی ایرانی گام‌های بسیاری برداشته است.
                </p>
                <p className="mt-5 text-white/80 leading-relaxed text-right">
                  مخاطبان مجموعه من حقیقی از جسورترین، شجاع‌ترین و خوش‌قلب‌ترین افرادی هستند که می‌شناسیم. آن‌ها به این
                  باور رسیده‌اند که با تغییر و تحول و انجام دادن و تبدیل شدن، می‌توانند پیروزمندانه از موانع عبور کنند.
                  چه به صورت حضوری و چه به صورت آنلاین می‌توانید با ما هم‌مسیر باشید. شما نیز بخشی از داستان ما هستید.
                </p>
              </motion.div>
            </motion.div>

            {/* Contact / form */}
            <motion.aside
              variants={stagger}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, amount: 0.25 }}
              className="space-y-6"
            >
              <motion.div
                variants={fadeUp}
                className="rounded-[36px] border border-white/10 bg-white/5 p-7 backdrop-blur"
              >
                <div className="flex items-center gap-4">
                  <img
                    src={assets.faraz}
                    alt="فراز قورچیان"
                    className="h-16 w-16 rounded-2xl object-cover border border-white/20"
                  />
                  <div className="flex-1">
                    <p className="text-sm font-semibold uppercase tracking-[0.35em] text-yellow-400">فراز قورچیان</p>
                    <p className="mt-2 text-white/70 text-sm">موسس و مدیر مجموعه من حقیقی</p>
                  </div>
                </div>

                <div className="mt-6 rounded-2xl border border-white/10 bg-black/30 p-5">
                  <p className="text-sm text-white/70 text-right">شماره تماس:</p>
                  <a
                    className="mt-2 block text-2xl font-black text-yellow-400 text-right hover:text-yellow-300 transition-colors"
                    href={`tel:${CONTACT_PHONE_TEL}`}
                  >
                    {CONTACT_PHONE_DISPLAY}
                  </a>
                  <p className="mt-3 text-xs text-white/50 text-right">
                    پاسخ‌گویی توسط کارشناسان آموزش‌دیده · در ساعات کاری
                  </p>
                </div>

                <div className="mt-6 grid grid-cols-2 gap-3">
                  {assets.gallery.slice(0, 4).map((src) => (
                    <div key={src} className="relative overflow-hidden rounded-2xl border border-white/10">
                      <img src={src} alt="گالری" className="h-32 w-full object-cover" />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                    </div>
                  ))}
                </div>
              </motion.div>

              <motion.div
                variants={fadeUp}
                className="rounded-[36px] border border-white/10 bg-[#0a0a0a] p-7"
              >
                <p className="text-sm font-semibold uppercase tracking-[0.5em] text-yellow-400">پیام برای ما</p>
                <h3 className="mt-4 text-2xl font-bold text-right">فرم تماس</h3>
                <p className="mt-3 text-white/70 text-right">
                  اگر نیاز به راهنمایی دارید، اطلاعات را ثبت کنید تا با شما تماس بگیریم.
                </p>

                <form onSubmit={onSubmit} className="mt-6 space-y-4">
                  <div>
                    <label className="block text-sm text-white/70 mb-2 text-right">نام و نام خانوادگی</label>
                    <input
                      value={form.name}
                      onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                      className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white placeholder-white/30 outline-none focus:border-yellow-400/40"
                      placeholder="مثلاً: آریا احمدی"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-white/70 mb-2 text-right">شماره تماس</label>
                    <input
                      value={form.phone}
                      onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))}
                      className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white placeholder-white/30 outline-none focus:border-yellow-400/40"
                      placeholder="مثلاً: 0912xxxxxxx"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-white/70 mb-2 text-right">پیام</label>
                    <textarea
                      value={form.message}
                      onChange={(e) => setForm((p) => ({ ...p, message: e.target.value }))}
                      className="min-h-[120px] w-full resize-none rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white placeholder-white/30 outline-none focus:border-yellow-400/40"
                      placeholder="موضوع یا درخواست شما..."
                      required
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full rounded-full bg-gradient-to-r from-yellow-400 via-yellow-500 to-yellow-600 px-8 py-3 text-sm font-semibold uppercase tracking-widest text-black shadow-[0_25px_60px_-20px_rgba(250,204,21,0.6)] transition hover:scale-[1.01] disabled:opacity-60"
                  >
                    {submitting ? 'در حال ارسال...' : 'ارسال پیام'}
                  </button>
                </form>
              </motion.div>
            </motion.aside>
          </div>
        </section>

        {/* Callout */}
        <section className="border-t border-white/10 py-12 sm:py-16">
          <motion.div
            variants={fadeUp}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.3 }}
            className="relative overflow-hidden rounded-[40px] border border-white/10 bg-gradient-to-r from-black via-[#0b0b0b] to-black p-10"
          >
            <div className="pointer-events-none absolute inset-y-0 right-0 w-1/3 bg-gradient-to-l from-yellow-500/20 to-transparent" />
            <div className="relative space-y-5">
              <p className="text-sm font-semibold uppercase tracking-[0.5em] text-yellow-400">هم‌مسیر شوید</p>
              <h2 className="text-3xl font-bold sm:text-4xl text-right">
                من حقیقی چطور شکل گرفت؟ حتما ببین
              </h2>
              <p className="max-w-3xl text-white/70 text-right">
                چه حضوری و چه آنلاین، می‌توانید با ما هم‌مسیر باشید. برای دیدن مسیر شکل‌گیری و آشنایی عمیق‌تر با من حقیقی،
                وارد صفحه معرفی شوید.
              </p>
              <div className="flex flex-wrap gap-4">
                <button
                  onClick={() => navigate('/about')}
                  className="rounded-full bg-white px-8 py-3 text-sm font-semibold uppercase tracking-[0.4em] text-black transition hover:bg-white/90"
                >
                  معرفی من حقیقی
                </button>
                <a
                  href={`tel:${CONTACT_PHONE_TEL}`}
                  className="rounded-full border border-white/30 px-8 py-3 text-sm font-semibold uppercase tracking-[0.4em] text-white transition hover:border-white hover:bg-white/10"
                >
                  تماس · {CONTACT_PHONE_DISPLAY}
                </a>
              </div>
            </div>
          </motion.div>
        </section>
      </main>
    </div>
  );
};

export default Contact;


