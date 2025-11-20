// client/src/pages/ErrorPage.jsx
import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { motion as Motion, AnimatePresence } from "framer-motion";
import { TbPlugConnectedX, TbError404, TbLockAccessOff, TbServerOff, TbClockHour3 } from "react-icons/tb";
import { useTranslation } from 'react-i18next';

// --- Komponen ErrorPage ---

/**
 * Komponen untuk menampilkan halaman error dengan animasi yang menarik.
 * @param {object} props - Properti komponen.
 * @param {number} [props.code=404] - Kode error (e.g., 404, 500).
 * @param {string} [props.message] - Pesan error kustom.
 */
const ErrorPage = ({ code = 404, message }) => {
  const navigate = useNavigate();
  const { t } = useTranslation();

  // Mapping pesan dan ikon berdasarkan kode error menggunakan useMemo untuk optimasi
  const { displayMessage, IconComponent, glowColor } = useMemo(() => {
    const errorData = {
      404: {
        message: t('error.404'),
        icon: TbError404,
        color: "bg-red-500",
      },
      500: {
        message: t('error.500'),
        icon: TbServerOff,
        color: "bg-orange-500",
      },
      401: {
        message: t('error.401'),
        icon: TbLockAccessOff,
        color: "bg-indigo-500",
      },
      403: {
        message: t('error.403'),
        icon: TbLockAccessOff,
        color: "bg-indigo-500",
      },
      408: {
        message: t('error.408'),
        icon: TbClockHour3,
        color: "bg-yellow-500",
      },
      default: {
        message: t('error.default'),
        icon: TbPlugConnectedX,
        color: "bg-gray-500",
      },
    };

    const data = errorData[code] || errorData.default;
    return {
      displayMessage: message || data.message,
      IconComponent: data.icon,
      glowColor: data.color,
    };
  }, [code, message, t]);


  // Varian animasi untuk elemen-elemen
  const containerVariants = {
    initial: { opacity: 0 },
    animate: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1, // Jeda antar elemen
      },
    },
  };

  const itemVariants = {
    initial: { y: 30, opacity: 0, scale: 0.95 },
    animate: {
      y: 0,
      opacity: 1,
      scale: 1,
      transition: {
        type: "spring",
        stiffness: 100,
        damping: 12,
      },
    },
  };

  return (
    <AnimatePresence mode="wait">
      <Motion.div
        className="min-h-screen flex flex-col items-center justify-center text-center bg-gray-900 text-white overflow-hidden relative p-6 font-sans"
        variants={containerVariants}
        initial="initial"
        animate="animate"
      >
        {/* Latar Belakang & Efek Cahaya Utama yang Lebih Dinamis */}
        <Motion.div
          className={`absolute w-[800px] h-[800px] ${glowColor}/30 blur-[200px] rounded-full -z-10 opacity-70`}
          animate={{
            scale: [1, 1.05, 0.95, 1],
            rotate: [0, 20, -10, 0],
          }}
          transition={{
            duration: 12,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />

        {/* Icon Error Besar sebagai fokus visual baru */}
        <Motion.div
          variants={itemVariants}
          className={`p-6 rounded-full ${glowColor}/50 shadow-2xl backdrop-blur-sm mb-6`}
          initial={{ rotate: -15 }}
          animate={{ rotate: 0 }}
          transition={{ type: "spring", stiffness: 80, damping: 10, delay: 0.1 }}
        >
          <IconComponent className="text-7xl sm:text-8xl text-white drop-shadow-lg" />
        </Motion.div>

        {/* Angka Kode Error (tetap dipertahankan) */}
        <Motion.h1
          className="text-7xl sm:text-8xl md:text-9xl font-extrabold text-white select-none drop-shadow-xl tracking-wider"
          variants={itemVariants}
          transition={{ ...itemVariants.animate.transition, delay: 0.2 }}
        >
          {code}
        </Motion.h1>

        {/* Pesan Subjudul */}
        <Motion.p
          className="text-lg sm:text-xl text-gray-400 mt-4 max-w-xl"
          variants={itemVariants}
          transition={{ ...itemVariants.animate.transition, delay: 0.3 }}
        >
          {displayMessage}
        </Motion.p>

        <Motion.p
          className="text-sm text-gray-500 mt-2"
          variants={itemVariants}
          transition={{ ...itemVariants.animate.transition, delay: 0.4 }}
        >
          {t('error.apology')}
        </Motion.p>

        {/* Tombol Aksi */}
        <Motion.div
          className="mt-10 flex flex-col sm:flex-row gap-4 justify-center"
          variants={itemVariants}
          transition={{ ...itemVariants.animate.transition, delay: 0.5 }}
        >
          <Motion.button
            whileHover={{ scale: 1.05, boxShadow: "0 10px 15px -3px rgba(239, 68, 68, 0.3)" }}
            whileTap={{ scale: 0.95 }}
            onClick={() => navigate(-1)}
            className="px-8 py-3 rounded-full font-bold bg-red-600 text-white hover:bg-red-700 transition-all shadow-lg"
          >
            ← {t('error.back')}
          </Motion.button>
          <Motion.button
            whileHover={{ scale: 1.05, boxShadow: "0 10px 15px -3px rgba(156, 163, 175, 0.2)" }}
            whileTap={{ scale: 0.95 }}
            onClick={() => navigate("/")}
            className="px-8 py-3 rounded-full font-bold border border-gray-600 text-gray-300 hover:bg-gray-800 transition-all"
          >
            {t('error.home')}
          </Motion.button>
        </Motion.div>

        {/* Animasi Partikel/Noise Latar Belakang Tambahan */}
        <Motion.div
          className="absolute w-16 h-16 bg-white/10 rounded-full top-[10%] left-[10%] blur-xl opacity-0 md:opacity-100"
          animate={{ x: [0, 50, 0], y: [0, -30, 0], scale: [1, 1.2, 1] }}
          transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
        />
        <Motion.div
          className="absolute w-20 h-20 bg-white/10 rounded-full bottom-[10%] right-[10%] blur-xl opacity-0 md:opacity-100"
          animate={{ x: [0, -40, 0], y: [0, 40, 0], scale: [1, 0.8, 1] }}
          transition={{ duration: 10, repeat: Infinity, ease: "linear", delay: 1 }}
        />

        {/* Footer */}
        <Motion.footer
          className="absolute bottom-6 text-gray-500 text-sm select-none"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1, duration: 0.5 }}
        >
          Solivra © {new Date().getFullYear()}
        </Motion.footer>
      </Motion.div>
    </AnimatePresence>
  );
};

export default ErrorPage;
