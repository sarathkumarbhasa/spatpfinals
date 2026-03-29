import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const SplashScreen = ({ onFinish }) => {
  const [currentSlide, setCurrentSlide] = useState(0);

  useEffect(() => {
    // Show slide 1 for 3 seconds, then slide 2 for 4 seconds, then finish
    const slide1Timer = setTimeout(() => setCurrentSlide(1), 3000);
    const finishTimer = setTimeout(() => onFinish(), 7000);

    return () => {
      clearTimeout(slide1Timer);
      clearTimeout(finishTimer);
    };
  }, [onFinish]);

  const slides = [
    {
      id: 0,
      image: '/black-bg.jpg',
      text: 'Welcome To'
    },
    {
      id: 1,
      image: '/black-bg.jpg',
      text: 'Anantapur Police Cyber Fraud Detection System'
    }
  ];

  return (
    <div className="fixed inset-0 z-[100] bg-black flex items-center justify-center overflow-hidden">
      <AnimatePresence mode="wait">
        <motion.div
          key={currentSlide}
          initial={{ opacity: 0, scale: 1.1 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ duration: 1.5, ease: "easeInOut" }}
          className="relative w-full h-full flex flex-col items-center justify-center p-8"
        >
          {/* Background Image with Overlay */}
          <div 
            className="absolute inset-0 bg-cover bg-center bg-no-repeat transition-all duration-1000"
            style={{ 
              backgroundImage: `url(${slides[currentSlide].image})`,
              filter: 'brightness(0.4)'
            }}
          />
          
          {/* Content Overlay */}
          <div className="relative z-10 text-center max-w-4xl flex flex-col items-center font-montserrat">
            {currentSlide === 1 && (
              <motion.img 
                src="/logo.png" 
                alt="Logo" 
                className="w-32 h-32 md:w-48 md:h-48 mb-8 object-contain shadow-2xl"
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.5, duration: 0.8 }}
              />
            )}
            
            <motion.h1 
              className="text-3xl md:text-5xl lg:text-6xl font-black text-white tracking-tighter drop-shadow-[0_10px_10px_rgba(0,0,0,0.5)] leading-tight uppercase"
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.3, duration: 0.8 }}
            >
              {slides[currentSlide].text}
            </motion.h1>
            
            <motion.div 
              className="mt-12 w-24 h-1 bg-blue-600 rounded-full"
              initial={{ width: 0 }}
              animate={{ width: 96 }}
              transition={{ delay: 1, duration: 1 }}
            />
          </div>
        </motion.div>
      </AnimatePresence>
      
      {/* Progress Bar at the Bottom */}
      <div className="absolute bottom-0 left-0 w-full h-1 bg-gray-900">
        <motion.div 
          className="h-full bg-blue-600"
          initial={{ width: "0%" }}
          animate={{ width: "100%" }}
          transition={{ duration: 7, ease: "linear" }}
        />
      </div>
    </div>
  );
};

export default SplashScreen;
