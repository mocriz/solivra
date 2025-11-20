import { useContext, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { Helmet } from "react-helmet-async";
import { AuthContext } from "../context/AuthContext";
import { useTranslation } from "react-i18next";
import { FiCheck, FiTrendingUp, FiTarget, FiAward, FiZap, FiBarChart2 } from "react-icons/fi";
import PublicHeader from "../components/PublicHeader";

const LandingPage = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { isAuthenticated } = useContext(AuthContext);

  function handleProtectedLink(e, path) {
    e.preventDefault();
    if (isAuthenticated) {
      toast.success(t("landing.alreadyLoggedIn"));
      navigate("/dashboard");
    } else {
      navigate(path);
    }
  }

  useEffect(() => {
    if (isAuthenticated) {
      navigate("/dashboard", { replace: true });
    }
  }, [isAuthenticated, navigate]);

  return (
    <>
      <Helmet>
        <title>Solivra - Transform Your Habits, Track Your Progress</title>
        <meta
          name="description"
          content="Solivra is a powerful habit tracking app that helps you build positive habits, maintain streaks, and achieve your goals. Start your transformation journey today with advanced progress tracking."
        />
        <meta name="keywords" content="habit tracker, streak counter, habit building app, progress tracking, personal development, goal achievement" />
        <meta property="og:title" content="Solivra - Transform Your Habits" />
        <meta property="og:description" content="Build powerful habits and track your progress with Solivra. Maintain streaks, stay motivated, and achieve your goals." />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://solivra.kiizzki.my.id" />
        <meta property="og:image" content="https://solivra.kiizzki.my.id/og-image.png" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="Solivra - Transform Your Habits" />
        <meta name="twitter:description" content="Build powerful habits and track your progress with Solivra." />
        <meta name="twitter:image" content="https://solivra.kiizzki.my.id/og-image.png" />
        <link rel="canonical" href="https://solivra.kiizzki.my.id" />
        
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "WebPage",
            "name": "Solivra - Habit Tracker",
            "description": "Transform your habits and track your progress with Solivra",
            "url": "https://solivra.kiizzki.my.id",
            "publisher": {
              "@type": "Organization",
              "name": "Solivra",
              "logo": {
                "@type": "ImageObject",
                "url": "https://solivra.kiizzki.my.id/logo.png",
              },
            },
            "mainEntity": {
              "@type": "SoftwareApplication",
              "name": "Solivra",
              "applicationCategory": "ProductivityApplication",
              "operatingSystem": "Any",
              "offers": {
                "@type": "Offer",
                "price": "0",
                "priceCurrency": "USD",
              },
            },
          })}
        </script>
      </Helmet>

      <div className="bg-bg text-text-primary min-h-screen">
        <PublicHeader showBackButton={false} />

        <main className="container mx-auto max-w-6xl px-5">
          <section className="py-12 md:py-32 text-center" aria-labelledby="hero-heading">
            <div className="space-y-4 md:space-y-6 max-w-3xl mx-auto">
              <div className="inline-block px-4 py-2 bg-primary/10 rounded-full border border-primary/20">
                <span className="text-primary font-semibold text-xs md:text-sm">✨ {t("landing.tagline")}</span>
              </div>
              
              <h2 id="hero-heading" className="text-3xl md:text-6xl font-bold leading-tight">
                {t("landing.heroHeadline")}
              </h2>
              
              <p className="text-base md:text-xl text-text-secondary max-w-2xl mx-auto leading-relaxed">
                {t("landing.heroDescription")}
              </p>
              
              <div className="flex flex-col sm:flex-row gap-3 md:gap-4 justify-center pt-4 md:pt-6">
                <Link
                  to="/register"
                  onClick={(e) => handleProtectedLink(e, "/register")}
                  className="px-6 md:px-8 py-3 md:py-4 font-bold text-white bg-primary rounded-xl hover:opacity-90 transition duration-300 text-sm md:text-base"
                >
                  {t("landing.startFreeTrial")}
                </Link>
                <Link
                  to="/login"
                  onClick={(e) => handleProtectedLink(e, "/login")}
                  className="px-6 md:px-8 py-3 md:py-4 font-bold text-text-primary bg-surface border border-border rounded-xl hover:bg-border/10 transition text-sm md:text-base"
                >
                  {t("landing.loginButton")}
                </Link>
              </div>

              <p className="text-xs md:text-sm text-text-secondary">
                {t("landing.noCardRequired")}
              </p>
            </div>
          </section>

          <section className="py-12 md:py-24" aria-labelledby="features-heading">
            <div className="text-center mb-12 md:mb-16">
              <h2 id="features-heading" className="text-3xl md:text-4xl font-bold mb-3 md:mb-4">
                {t("landing.featuresHeadline")}
              </h2>
              <p className="text-base md:text-lg text-text-secondary max-w-2xl mx-auto">
                {t("landing.featuresSubtitle")}
              </p>
            </div>

            <ul className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8 list-none p-0 m-0" role="list">
              <li className="group bg-surface/50 border border-border/50 p-6 md:p-8 rounded-2xl hover:border-primary/50 hover:bg-surface/80 transition duration-300 hover:shadow-lg focus-within:ring-2 focus-within:ring-primary">
                <article>
                <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4 group-hover:bg-primary/20 transition" aria-hidden="true">
                  <FiTrendingUp className="text-primary text-2xl" />
                </div>
                <h3 className="text-lg md:text-xl font-bold mb-3">{t("landing.feature1Title")}</h3>
                <p className="text-text-secondary text-sm md:text-base">
                  {t("landing.feature1Description")}
                </p>
                </article>
              </li>

              <li className="group bg-surface/50 border border-border/50 p-6 md:p-8 rounded-2xl hover:border-primary/50 hover:bg-surface/80 transition duration-300 hover:shadow-lg focus-within:ring-2 focus-within:ring-primary">
                <article>
                <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4 group-hover:bg-primary/20 transition" aria-hidden="true">
                  <FiZap className="text-primary text-2xl" />
                </div>
                <h3 className="text-lg md:text-xl font-bold mb-3">{t("landing.feature2Title")}</h3>
                <p className="text-text-secondary text-sm md:text-base">
                  {t("landing.feature2Description")}
                </p>
                </article>
              </li>

              <li className="group bg-surface/50 border border-border/50 p-6 md:p-8 rounded-2xl hover:border-primary/50 hover:bg-surface/80 transition duration-300 hover:shadow-lg focus-within:ring-2 focus-within:ring-primary">
                <article>
                <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4 group-hover:bg-primary/20 transition" aria-hidden="true">
                  <FiBarChart2 className="text-primary text-2xl" />
                </div>
                <h3 className="text-lg md:text-xl font-bold mb-3">{t("landing.feature3Title")}</h3>
                <p className="text-text-secondary text-sm md:text-base">
                  {t("landing.feature3Description")}
                </p>
                </article>
              </li>

              <li className="group bg-surface/50 border border-border/50 p-6 md:p-8 rounded-2xl hover:border-primary/50 hover:bg-surface/80 transition duration-300 hover:shadow-lg focus-within:ring-2 focus-within:ring-primary">
                <article>
                <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4 group-hover:bg-primary/20 transition" aria-hidden="true">
                  <FiTarget className="text-primary text-2xl" />
                </div>
                <h3 className="text-lg md:text-xl font-bold mb-3">{t("landing.feature4Title")}</h3>
                <p className="text-text-secondary text-sm md:text-base">
                  {t("landing.feature4Description")}
                </p>
                </article>
              </li>

              <li className="group bg-surface/50 border border-border/50 p-6 md:p-8 rounded-2xl hover:border-primary/50 hover:bg-surface/80 transition duration-300 hover:shadow-lg focus-within:ring-2 focus-within:ring-primary">
                <article>
                <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4 group-hover:bg-primary/20 transition" aria-hidden="true">
                  <FiAward className="text-primary text-2xl" />
                </div>
                <h3 className="text-lg md:text-xl font-bold mb-3">{t("landing.feature5Title")}</h3>
                <p className="text-text-secondary text-sm md:text-base">
                  {t("landing.feature5Description")}
                </p>
                </article>
              </li>

              <li className="group bg-surface/50 border border-border/50 p-6 md:p-8 rounded-2xl hover:border-primary/50 hover:bg-surface/80 transition duration-300 hover:shadow-lg focus-within:ring-2 focus-within:ring-primary">
                <article>
                <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4 group-hover:bg-primary/20 transition" aria-hidden="true">
                  <FiCheck className="text-primary text-2xl" />
                </div>
                <h3 className="text-lg md:text-xl font-bold mb-3">{t("landing.feature6Title")}</h3>
                <p className="text-text-secondary text-sm md:text-base">
                  {t("landing.feature6Description")}
                </p>
                </article>
              </li>
            </ul>
          </section>

          <section className="py-12 md:py-24 bg-surface/50 rounded-3xl px-6 md:px-12" aria-labelledby="cta-heading">
            <div className="text-center space-y-6 md:space-y-8">
              <div>
                <h2 id="cta-heading" className="text-3xl md:text-4xl font-bold mb-3 md:mb-4">
                  {t("landing.ctaHeading")}
                </h2>
                <p className="text-base md:text-lg text-text-secondary max-w-2xl mx-auto">
                  {t("landing.ctaSubtitle")}
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 md:gap-4 justify-center">
                <Link
                  to="/register"
                  onClick={(e) => handleProtectedLink(e, "/register")}
                  className="px-6 md:px-10 py-3 md:py-4 font-bold text-white bg-primary rounded-xl hover:opacity-90 transition duration-300 text-sm md:text-base"
                >
                  {t("landing.getStartedNow")}
                </Link>
                <Link
                  to="/login"
                  onClick={(e) => handleProtectedLink(e, "/login")}
                  className="px-6 md:px-10 py-3 md:py-4 font-bold text-text-primary bg-white/10 border border-white/20 rounded-xl hover:bg-white/20 transition text-sm md:text-base"
                >
                  {t("landing.alreadyHaveAccount")}
                </Link>
              </div>
            </div>
          </section>

          <section className="py-12 md:py-24" aria-labelledby="stats-heading">
            <h2 id="stats-heading" className="sr-only">Solivra Statistics</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-8 text-center">
              <div>
                <div className="text-2xl md:text-4xl font-bold text-primary mb-2">{t("landing.statsUsers")}</div>
                <p className="text-text-secondary text-xs md:text-base">{t("landing.statsLabel")}</p>
              </div>
              <div>
                <div className="text-2xl md:text-4xl font-bold text-primary mb-2">{t("landing.statsHabits")}</div>
                <p className="text-text-secondary text-xs md:text-base">{t("landing.statsHabitsLabel")}</p>
              </div>
              <div>
                <div className="text-2xl md:text-4xl font-bold text-primary mb-2">{t("landing.statsStreaks")}</div>
                <p className="text-text-secondary text-xs md:text-base">{t("landing.statsStreaksLabel")}</p>
              </div>
              <div>
                <div className="text-2xl md:text-4xl font-bold text-primary mb-2">{t("landing.statsRating")}</div>
                <p className="text-text-secondary text-xs md:text-base">{t("landing.statsRatingLabel")}</p>
              </div>
            </div>
          </section>
        </main>

        <footer className="border-t border-border/30 mt-16 md:mt-32 py-8 md:py-12 bg-surface/30">
          <div className="container mx-auto max-w-6xl px-5">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-8 mb-8 md:mb-12 place-items-center">
              <div className="text-center md:text-left">
                <h3 className="font-bold mb-3 text-sm md:text-base">Solivra</h3>
                <p className="text-text-secondary text-xs md:text-sm">{t("landing.footerTagline")}</p>
              </div>
              <div className="text-center md:text-left w-fit">
                <h4 className="font-semibold mb-3 text-sm md:text-base">Product</h4>
                <ul className=" text-xs md:text-sm text-text-secondary">
                  <li><Link to="/" className="hover:text-primary transition">Features</Link></li>
                  <li><Link to="/" className="hover:text-primary transition">Pricing</Link></li>
                  <li><Link to="/" className="hover:text-primary transition">Security</Link></li>
                </ul>
              </div>
              <div className="text-center md:text-left w-fit">
                <h4 className="font-semibold mb-3 text-sm md:text-base">Legal</h4>
                <ul className=" text-xs md:text-sm text-text-secondary">
                  <li><Link to="/" className="hover:text-primary transition">Privacy</Link></li>
                  <li><Link to="/" className="hover:text-primary transition">Terms</Link></li>
                  <li><Link to="/" className="hover:text-primary transition">Contact</Link></li>
                </ul>
              </div>
              <div className="text-center md:text-left w-fit">
                <h4 className="font-semibold mb-3 text-sm md:text-base">Follow</h4>
                <ul className=" text-xs md:text-sm text-text-secondary">
                  <li><a href="#" className="hover:text-primary transition">Twitter</a></li>
                  <li><a href="#" className="hover:text-primary transition">GitHub</a></li>
                  <li><a href="#" className="hover:text-primary transition">Discord</a></li>
                </ul>
              </div>
            </div>

            <div className="border-t border-border/30 pt-6 md:pt-8 text-center">
              <p className="text-text-secondary text-xs md:text-sm">&copy; {new Date().getFullYear()} Solivra. {t("landing.footer")}</p>
            </div>
          </div>
        </footer>
      </div>
    </>
  );
};

export default LandingPage;
