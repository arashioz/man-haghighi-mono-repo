import React, { useMemo } from 'react';
import { motion, type Variants } from 'framer-motion';
import { useNavigate } from 'react-router-dom';

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.75 } },
} satisfies Variants;

const stagger = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.12, delayChildren: 0.08 } },
} satisfies Variants;

const About: React.FC = () => {
  const navigate = useNavigate();

  const assets = useMemo(
    () => ({
      hero: '/assets/seminar-photo/DSC_0514.jpg',
      faraz: '/assets/faraz.jpg',
      gallery: [
        '/assets/sliders/Header-Site-1.jpg',
        '/assets/seminar-photo/IMG_4674.JPG',
        '/assets/seminar-photo/IMG_4676.JPG',
        '/assets/seminar-photo/DSC00117.jpg',
      ],
    }),
    [],
  );

  const focusAreas = [
    {
      title: 'خودشناسی و ناخودآگاه',
      desc: 'شناخت لایه‌های عمیق ذهن، بازنویسی الگوها و ساختن یک مسیر روشن برای رشد.',
    },
    {
      title: 'روابط عاطفی',
      desc: 'ارتباط سالم، مرزهای درست و مهارت‌هایی برای ساختن رابطه‌های امن و بالغ.',
    },
    {
      title: 'روابط مالی',
      desc: 'تغییر نگاه به پول، تصمیم‌گیری هوشمندانه و ساختن مسیر پایدار مالی.',
    },
    {
      title: 'معنا و توسعه فردی',
      desc: 'رشد درونی، هدف‌مندی و تبدیل شدن به نسخه‌ای که همیشه منتظرش بودی.',
    },
  ];

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white" dir="rtl" data-version2="true">
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0">
          <img src={assets.hero} alt="درباره ما" className="h-full w-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/55 to-[#0a0a0a]" />
        </div>

        <div className="relative mx-auto max-w-6xl px-4 pb-12 pt-14 sm:px-8 sm:pb-16 sm:pt-20">
          <motion.div variants={stagger} initial="hidden" animate="visible" className="space-y-6">
            <motion.p
              variants={fadeUp}
              className="text-sm font-semibold uppercase tracking-[0.5em] text-yellow-400"
            >
              درباره ما
            </motion.p>
            <motion.h1 variants={fadeUp} className="text-4xl font-black sm:text-5xl lg:text-6xl text-right">
              موسسه آموزشی  من حقیقی
            </motion.h1>
            <motion.p variants={fadeUp} className="max-w-3xl text-lg text-white/80 text-right">
              هشت سال فعالیت مستمر در مسیر آموزش معنا، رشد و توسعه فردی؛ با همراهی مخاطبانی از ایران و جهان.
            </motion.p>

            <motion.div variants={fadeUp} className="flex flex-wrap gap-4">
              <button
                onClick={() => navigate('/contact')}
                className="rounded-full bg-gradient-to-r from-yellow-400 via-yellow-500 to-yellow-600 px-8 py-3 text-sm font-semibold uppercase tracking-widest text-black shadow-[0_25px_60px_-20px_rgba(250,204,21,0.8)] transition hover:scale-105"
              >
                ارتباط با ما
              </button>
              <button
                onClick={() => navigate('/courses')}
                className="rounded-full border border-white/30 px-8 py-3 text-sm font-semibold uppercase tracking-widest text-white transition hover:border-white hover:bg-white/10"
              >
                دوره‌ها و برنامه‌ها
              </button>
            </motion.div>
          </motion.div>
        </div>
      </section>

      <main className="mx-auto w-full max-w-6xl px-4 pb-16 sm:px-8">
        {/* Story */}
        <section className="border-t border-white/10 py-12 sm:py-16">
          <div className="grid gap-10 lg:grid-cols-[1.05fr_0.95fr] lg:items-start">
            <motion.div
              variants={stagger}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, amount: 0.25 }}
              className="space-y-6"
            >
              <motion.h2 variants={fadeUp} className="text-3xl font-bold sm:text-4xl text-right">
                داستان ما
              </motion.h2>

              <motion.div
                variants={fadeUp}
                className="rounded-[32px] border border-white/10 bg-white/5 p-7 backdrop-blur"
              >
                <p className="text-white/80 leading-relaxed text-right">
                  موسسه آموزشی  من حقیقی به مدت هشت سال است که فعالیت‌های خود را در زمینه‌های آموزش معنا و رشد و
                  توسعه‌ی فردی آغاز کرده است. این موسسه به مدیریت جناب آقای فراز قورچیان، با برگزاری موفقیت‌آمیز بیش از
                  دو هزار کارگاه آموزشی در موضوعات خودشناسی، ناخودآگاه، روابط عاطفی و روابط مالی، میزبان مخاطبانی از نقاط
                  مختلف ایران و جهان بوده است.
                </p>
                <p className="mt-5 text-white/80 leading-relaxed text-right">
                  تا کنون بیش از دویست هزار نفر شرکت‌کننده از خدمات آموزشی این مجموعه بهره‌مند شده‌اند. دستیابی به نتایج
                  شگفت‌انگیز و تغییرات مثبت چشمگیر در رشد و توسعه‌ی فردی و سلامت جسمی و روانی در شرکت‌کنندگان، از افتخارات
                  کاری این مجموعه است.
                </p>
                <p className="mt-5 text-white/80 leading-relaxed text-right">
                  مخاطبان من حقیقی با بهره‌گیری از دوره‌ها، کارگاه‌ها و تکنیک‌های منحصر‌به‌فرد، توانسته‌اند بر مشکلات روانی،
                  جسمی، مالی و عاطفی خود فائق آیند و مسیر تازه‌ای برای زندگی‌شان بسازند.
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
            </motion.div>

            {/* Visual / founder */}
            <motion.aside
              variants={stagger}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, amount: 0.25 }}
              className="space-y-6"
            >
              {/* Immersive gallery collage */}
              <motion.div
                variants={fadeUp}
                className="relative overflow-hidden rounded-[44px] border border-white/10 bg-gradient-to-br from-white/5 via-white/0 to-white/5"
              >
                <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-black/20 to-black/60" />
                <div className="grid grid-cols-2 gap-3 p-4 sm:p-5">
                  {assets.gallery.map((src, idx) => (
                    <div
                      key={src}
                      className={`relative overflow-hidden rounded-3xl border border-white/15 ${idx === 0 ? 'col-span-2 row-span-2' : ''}`}
                      style={{ minHeight: idx === 0 ? 260 : 140 }}
                    >
                      <img
                        src={src}
                        alt="گالری"
                        className="h-full w-full object-cover transition duration-700 ease-out hover:scale-105"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-transparent to-transparent" />
                    </div>
                  ))}
                </div>
              </motion.div>

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
                    <p className="mt-2 text-white/70 text-sm">موسس، مدیرعامل و راهبر گروه آموزشی من حقیقی</p>
                  </div>
                </div>
                <p className="mt-6 text-white/80 leading-relaxed text-right">
                  فراز قورچیان به عنوان محقق، مدرس و سخنران در حوزه خودآگاهی، توسعه فردی و معنا فعالیت می‌کنند و با مدیریت
                  و راهبری تیم من حقیقی، مسیر رشد مخاطبان را با راهبردهای آموزشی و تجربه‌های عملی همراهی می‌کنند.
                </p>
              </motion.div>
            </motion.aside>
          </div>
        </section>

        {/* Focus areas */}
        <section className="border-t border-white/10 py-12 sm:py-16">
          <motion.div
            variants={stagger}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.25 }}
            className="space-y-8"
          >
            <motion.div variants={fadeUp} className="space-y-4">
              <p className="text-sm font-semibold uppercase tracking-[0.5em] text-yellow-400">حوزه‌ها</p>
              <h2 className="text-3xl font-bold sm:text-4xl text-right">آنچه در من حقیقی پیدا می‌کنید</h2>
              <p className="max-w-3xl text-white/70 text-right">
                کارگاه‌ها و دوره‌های ما حول هسته‌های کلیدی خودشناسی، ناخودآگاه، روابط و معنا طراحی شده‌اند—هم برای حضور
                در سالن و هم برای همراهی آنلاین.
              </p>
            </motion.div>

            <div className="grid gap-6 md:grid-cols-2">
              {focusAreas.map((item) => (
                <motion.div
                  key={item.title}
                  variants={fadeUp}
                  className="rounded-[32px] border border-white/10 bg-[#0a0a0a] p-8 hover:border-yellow-500/30 transition-colors"
                >
                  <p className="text-xs uppercase tracking-[0.5em] text-yellow-400">محور آموزشی</p>
                  <h3 className="mt-4 text-2xl font-bold text-right">{item.title}</h3>
                  <p className="mt-4 text-white/70 leading-relaxed text-right">{item.desc}</p>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </section>

        {/* Mission / CTA */}
        <section className="border-t border-white/10 py-12 sm:py-16">
          <motion.div
            variants={fadeUp}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.3 }}
            className="relative overflow-hidden rounded-[40px] border border-white/10 bg-gradient-to-r from-black via-[#0b0b0b] to-black p-10"
          >
            <div className="pointer-events-none absolute inset-y-0 right-0 w-1/3 bg-gradient-to-l from-yellow-500/20 to-transparent" />
            <div className="relative space-y-6">
              <p className="text-sm font-semibold uppercase tracking-[0.5em] text-yellow-400">هم‌مسیر شوید</p>
              <h2 className="text-3xl font-bold sm:text-4xl text-right">
                چه حضوری، چه آنلاین—شما هم بخشی از داستان ما هستید
              </h2>
              <p className="max-w-3xl text-white/70 text-right">
                ما با برگزاری همایش‌ها و سمینارهای عمومی در مناسبت‌های مختلف، در مسیر آگاهی‌بخشی و سلامت جامعه ایرانی گام
                برداشته‌ایم. اگر آماده تغییر و تحول هستید، با ما همراه شوید.
              </p>
              <div className="flex flex-wrap gap-4">
                <button
                  onClick={() => navigate('/contact')}
                  className="rounded-full bg-white px-8 py-3 text-sm font-semibold uppercase tracking-[0.4em] text-black transition hover:bg-white/90"
                >
                  تماس با ما
                </button>
                <button
                  onClick={() => navigate('/courses')}
                  className="rounded-full border border-white/30 px-8 py-3 text-sm font-semibold uppercase tracking-[0.4em] text-white transition hover:border-white hover:bg-white/10"
                >
                  مشاهده دوره‌ها
                </button>
              </div>
            </div>
          </motion.div>
        </section>
      </main>
    </div>
  );
};

export default About;
