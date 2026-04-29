"use client";

import { usePathname, useRouter } from "next/navigation";
import React, { useState, useRef, useEffect } from "react";
import { User, LogOut, Mail, Menu, X, ChevronRight } from "lucide-react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";

const PROTECTED_ROUTES = ["/", "/registerd", "/login", "/rules/login", "/onboarding", "/ip-check"];

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClick = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  // Prevent background scroll when mobile menu is open
  useEffect(() => {
    if (isMobileMenuOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
  }, [isMobileMenuOpen]);

  useEffect(() => {
    setIsOpen(false);
    setIsMobileMenuOpen(false);
  }, [pathname]);

  if (PROTECTED_ROUTES.includes(pathname)) return null;

  return (
    <nav className="relative z-50 flex h-16 w-full shrink-0 items-center border-b border-[#24aa4d]/35 bg-gradient-to-r from-[#010806] via-[#071910] to-[#03140c] shadow-[inset_0_-1px_0_0_rgba(36,170,77,0.12)] md:h-20">
      <div className="w-full max-w-[1440px] mx-auto px-4 sm:px-6 md:px-8 flex items-center justify-between">
        
        {/* LEFT: Mobile Menu Button & Logo */}
        <div className="flex items-center gap-3 md:gap-4">
          <button
            className="md:hidden p-2 -ml-2 text-[#24aa4d] active:bg-[#24aa4d]/10 rounded-lg transition-colors"
            onClick={() => setIsMobileMenuOpen(true)}
            aria-label="Open Menu"
          >
            <Menu size={24} />
          </button>
          
          <Link href="/" className="flex items-center">
            <img
              src="/white_logo.png" 
              alt="Logo"
              className="h-12 md:h-16 w-auto object-contain transition-all"
            />
          </Link>
        </div>

        {/* RIGHT: Profile Dropdown */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="flex items-center p-1 rounded-full border border-[#24aa4d]/40 bg-black active:scale-90 transition-transform"
          >
            <div className={`w-8 h-8 md:w-10 md:h-10 flex items-center justify-center rounded-full text-white transition-colors ${isOpen ? "bg-[#5edd7c]" : "bg-[#24aa4d]"}`}>
              <User className="w-4 h-4 md:w-5 md:h-5" />
            </div>
          </button>

          <AnimatePresence>
            {isOpen && (
              <motion.div
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 10, scale: 0.95 }}
                className="absolute right-0 mt-3 w-56 md:w-64 bg-[#080808] border border-[#24aa4d]/40 rounded-xl shadow-2xl z-[60] overflow-hidden"
              >
                <div className="p-4 border-b border-[#24aa4d]/10">
                  <p className="text-[10px] text-[#5edd7c] font-black uppercase">User Account</p>
                  <p className="text-white text-xs md:text-sm font-bold truncate">support@bargad.ai</p>
                </div>
                <div className="p-1">
                  <button
                    onClick={() => router.push("/")}
                    className="w-full flex items-center justify-between px-4 py-3 text-white/80 hover:bg-red-500/10 hover:text-red-500 rounded-lg transition-all group"
                  >
                    <div className="flex items-center gap-3">
                      <LogOut size={16} />
                      <span className="text-xs font-bold uppercase">Log Out</span>
                    </div>
                    <ChevronRight size={14} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* MOBILE DRAWER (Optimized for Portrait Resolution) */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/80 backdrop-blur-md z-[60]"
              onClick={() => setIsMobileMenuOpen(false)}
            />
            <motion.div
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "tween", duration: 0.3 }}
              className="fixed inset-y-0 left-0 w-[280px] bg-[#050505] z-[70] border-r border-[#24aa4d]/20 p-6 flex flex-col"
            >
              <div className="flex items-center justify-between mb-10">
                <img src="/white_logo.png" className="h-8 w-auto" alt="Logo" />
                <button onClick={() => setIsMobileMenuOpen(false)} className="p-2 text-[#24aa4d]">
                  <X size={24} />
                </button>
              </div>

              <div className="flex flex-col gap-2">
                {[
                  { name: "Dashboard", path: "/product" },
                  { name: "Manage Rules", path: "/rules" },
                  { name: "Analytics", path: "/analytics" }
                ].map((item) => (
                  <Link
                    key={item.path}
                    href={item.path}
                    className={`px-4 py-4 rounded-lg font-black uppercase tracking-widest text-sm transition-colors ${
                      pathname === item.path ? "bg-[#24aa4d]/10 text-[#24aa4d]" : "text-white/60 active:bg-white/5"
                    }`}
                  >
                    {item.name}
                  </Link>
                ))}
              </div>

              <div className="mt-auto pt-6 border-t border-[#24aa4d]/10">
                <div className="flex items-center gap-3 px-4">
                  <div className="w-8 h-8 rounded-full bg-[#24aa4d]/20 flex items-center justify-center text-[#24aa4d]">
                    <Mail size={14} />
                  </div>
                  <span className="text-[10px] text-white/40 font-bold uppercase truncate">support@bargad.ai</span>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </nav>
  );
}