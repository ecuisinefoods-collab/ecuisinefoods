import Link from "next/link";
import { SiteHeader } from "@/components/site-header";

const faqs = [
  ["How do I place an order?", "Visit Shop, choose a product and pack size, add it to your cart, then complete the checkout form with your contact details and preferred pickup or delivery option."],
  ["Where can I collect my order?", "Choose one of the available eCuisine pickup points in Jos or Bauchi during checkout. Please wait for the team to confirm that your order is ready before visiting the location."],
  ["How does bank transfer work?", "When bank transfer is available and selected, submit your checkout details first. The confirmation page will display the bank name, account name, account number, exact amount and a unique transfer narration/reference for your order. Enter that reference exactly in your banking app."],
  ["How do I send my transfer receipt?", "After making the transfer, return to the order confirmation page and select “I have made the transfer — send screenshot on WhatsApp”. WhatsApp opens with your order details. Attach the transfer receipt screenshot from your phone and send it to eCuisine."],
  ["When is my bank transfer confirmed?", "A transfer is not confirmed just because an order was submitted or a screenshot was sent. Your order stays pending until the eCuisine team checks the business account and manually verifies that the money has arrived."],
  ["Can I pay when I collect or receive my order?", "Cash on pickup or cash on delivery will appear at checkout when that option is enabled for the selected fulfilment method. Follow the payment options shown for your order."],
  ["How do I track my order?", "Use the private tracking code shown after checkout. Open Track my order from the store navigation, paste the code and view the latest status, fulfilment details and items. A tracking link is also provided after checkout."],
  ["Is home delivery available everywhere?", "Delivery is offered only in areas that have been configured by eCuisine. If no delivery area is available for your address, choose one of the pickup points shown at checkout."],
  ["How do I know a product's price or pack size?", "Available pack sizes and current prices are displayed on each product page and in your cart before you place the order."],
  ["Can I ask about ingredients or nutrition?", "Product information is displayed when verified details have been provided. Contact our team if you need help with a product question."],
  ["How can I contact eCuisine?", "Email ecuisinefoods@gmail.com or message our team on WhatsApp at +234 808 094 2328. You can also use the Contact page."],
];

export default function FAQPage() {
  return (
    <main className="storefront-glass min-h-screen bg-[#fbfaf7]">
      <div className="bg-[#173e2d] px-4 py-2 text-center text-xs text-white">Good food, better living</div>
      <SiteHeader />
      <section className="mx-auto max-w-4xl px-5 py-14 sm:py-20">
        <p className="text-xs font-bold uppercase tracking-[.18em] text-[#78906b]">eCuisine help centre</p>
        <h1 className="mt-3 text-4xl font-semibold tracking-tight text-[#173e2d]">Frequently asked questions</h1>
        <p className="mt-4 max-w-2xl leading-7 text-[#68766b]">Clear answers about shopping, pickup, delivery, payment and order updates.</p>
        <div className="mt-9 space-y-3">
          {faqs.map(([question, answer]) => (
            <details key={question} className="group rounded-2xl border border-[#e8e9e1] bg-white p-5 transition open:border-[#cdddc9]">
              <summary className="cursor-pointer list-none pr-6 font-bold text-[#203329] marker:hidden">{question}</summary>
              <p className="mt-3 max-w-3xl leading-7 text-[#68766b]">{answer}</p>
            </details>
          ))}
        </div>
        <div className="mt-9 rounded-2xl bg-[#edf3e9] p-5 sm:p-6">
          <h2 className="font-bold text-[#173e2d]">Still need a hand?</h2>
          <p className="mt-2 text-sm leading-6 text-[#68766b]">Our team can help with order progress, payment checks, product questions and pickup information.</p>
          <div className="mt-4 flex flex-wrap gap-3">
            <Link href="/track" className="rounded-full bg-[#245b42] px-5 py-3 text-sm font-bold text-white">Track an order</Link>
            <Link href="/contact" className="rounded-full border border-[#cbd8c8] bg-white px-5 py-3 text-sm font-bold text-[#245b42]">Contact eCuisine</Link>
          </div>
        </div>
      </section>
    </main>
  );
}
