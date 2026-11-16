"use client";

import { MessageCircle } from "lucide-react";

export function FloatingWhatsApp(){
 return <a href="https://wa.me/2348080942328" target="_blank" rel="noopener noreferrer" aria-label="Chat with eCuisinefoods on WhatsApp" className="floating-whatsapp fixed bottom-5 right-4 z-[65] inline-flex items-center gap-2 rounded-full bg-[#18a957] px-4 py-3 text-xs font-extrabold text-white shadow-[0_12px_30px_rgba(10,95,48,.28)] transition hover:-translate-y-1 hover:bg-[#128647] sm:bottom-6 sm:right-6"><MessageCircle size={19}/><span className="hidden sm:inline">Chat with us</span></a>;
}
