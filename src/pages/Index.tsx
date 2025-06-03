
import React, { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { gsap } from 'gsap';
import { Send, Download } from 'lucide-react';

const Index = () => {
  const navigate = useNavigate();
  const containerRef = useRef<HTMLDivElement>(null);
  const sendButtonRef = useRef<HTMLButtonElement>(null);
  const receiveButtonRef = useRef<HTMLButtonElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const subtitleRef = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      // Initial setup - hide elements
      gsap.set([titleRef.current, subtitleRef.current, sendButtonRef.current, receiveButtonRef.current], {
        opacity: 0,
        y: 50
      });

      // Animate entrance
      const tl = gsap.timeline();
      tl.to(titleRef.current, { opacity: 1, y: 0, duration: 0.8, ease: "power3.out" })
        .to(subtitleRef.current, { opacity: 1, y: 0, duration: 0.6, ease: "power3.out" }, "-=0.4")
        .to([sendButtonRef.current, receiveButtonRef.current], {
          opacity: 1,
          y: 0,
          duration: 0.8,
          stagger: 0.2,
          ease: "power3.out"
        }, "-=0.3");

      // Button hover animations
      const setupButtonHover = (button: HTMLButtonElement | null) => {
        if (!button) return;
        
        button.addEventListener('mouseenter', () => {
          gsap.to(button, { scale: 1.05, duration: 0.3, ease: "power2.out" });
        });
        
        button.addEventListener('mouseleave', () => {
          gsap.to(button, { scale: 1, duration: 0.3, ease: "power2.out" });
        });
      };

      setupButtonHover(sendButtonRef.current);
      setupButtonHover(receiveButtonRef.current);

      // Floating animation for background
      gsap.to(".floating-circle", {
        y: "random(-20, 20)",
        x: "random(-20, 20)",
        duration: "random(3, 6)",
        ease: "sine.inOut",
        repeat: -1,
        yoyo: true,
        stagger: {
          amount: 2,
          from: "random"
        }
      });

    }, containerRef);

    return () => ctx.revert();
  }, []);

  const handleButtonClick = (path: string, button: HTMLButtonElement | null) => {
    if (!button) return;
    
    gsap.to(button, {
      scale: 0.95,
      duration: 0.1,
      yoyo: true,
      repeat: 1,
      onComplete: () => navigate(path)
    });
  };

  return (
    <div ref={containerRef} className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 relative overflow-hidden">
      {/* Animated background circles */}
      <div className="absolute inset-0 pointer-events-none">
        {[...Array(8)].map((_, i) => (
          <div
            key={i}
            className="floating-circle absolute rounded-full bg-gradient-to-r from-blue-200/30 to-purple-200/30"
            style={{
              width: `${Math.random() * 100 + 50}px`,
              height: `${Math.random() * 100 + 50}px`,
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
            }}
          />
        ))}
      </div>

      <div className="relative z-10 min-h-screen flex flex-col items-center justify-center px-4">
        <div className="text-center space-y-8 max-w-4xl mx-auto">
          <h1 
            ref={titleRef}
            className="text-6xl md:text-8xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent"
          >
            Drop & Share
          </h1>
          
          <p 
            ref={subtitleRef}
            className="text-xl md:text-2xl text-gray-600 max-w-2xl mx-auto leading-relaxed"
          >
            Share files instantly with anyone, anywhere. No accounts needed.
          </p>

          <div className="flex flex-col sm:flex-row gap-6 justify-center items-center mt-12">
            <button
              ref={sendButtonRef}
              onClick={() => handleButtonClick('/send', sendButtonRef.current)}
              className="group relative bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white px-12 py-6 rounded-2xl font-semibold text-xl shadow-2xl transition-all duration-300 min-w-[200px]"
            >
              <div className="flex items-center justify-center space-x-3">
                <Send className="w-6 h-6 group-hover:translate-x-1 transition-transform duration-300" />
                <span>Send Files</span>
              </div>
              <div className="absolute inset-0 bg-gradient-to-r from-blue-400 to-blue-500 rounded-2xl opacity-0 group-hover:opacity-20 transition-opacity duration-300"></div>
            </button>

            <button
              ref={receiveButtonRef}
              onClick={() => handleButtonClick('/receive', receiveButtonRef.current)}
              className="group relative bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white px-12 py-6 rounded-2xl font-semibold text-xl shadow-2xl transition-all duration-300 min-w-[200px]"
            >
              <div className="flex items-center justify-center space-x-3">
                <Download className="w-6 h-6 group-hover:translate-y-1 transition-transform duration-300" />
                <span>Receive Files</span>
              </div>
              <div className="absolute inset-0 bg-gradient-to-r from-purple-400 to-purple-500 rounded-2xl opacity-0 group-hover:opacity-20 transition-opacity duration-300"></div>
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="absolute bottom-8 left-0 right-0 text-center">
          <div className="flex flex-wrap justify-center items-center gap-6 text-gray-500 text-sm">
            <a href="#" className="hover:text-gray-700 transition-colors">Privacy Policy</a>
            <a href="#" className="hover:text-gray-700 transition-colors">Terms of Service</a>
            <span className="flex items-center space-x-1">
              <span>Built </span>
              <span className="text-red-500">❤️</span>
              <span>by Supreeth</span>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Index;
