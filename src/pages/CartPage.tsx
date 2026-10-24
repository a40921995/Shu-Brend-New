import React, { useState } from 'react';
import {
  Trash2,
  Plus,
  Minus,
  MapPin,
  ShoppingBag,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  Clock,
  Sparkles,
  Phone,
  User as UserIcon,
  CreditCard,
  Banknote,
  AlertCircle,
  ExternalLink,
  X,
  Check,
  Copy,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { useApp } from '../context/AppContext.tsx';
import { api, formatUzbekPrice } from '../lib/api.ts';
import { MapPickerModal } from '../components/MapPickerModal.tsx';
import type { LocationCoords, Order, PaymentMethod } from '../types/index.ts';


export const CartPage: React.FC = () => {
  const {
    cart,
    removeFromCart,
    updateQuantity,
    clearCart,
    cartTotal,
    user,
    settings,
    setActiveTab,
    showToast,
  } = useApp();

  const [checkoutStep, setCheckoutStep] = useState<'cart' | 'form'>('cart');
  const [customerName, setCustomerName] = useState(user?.name || '');
  const [customerPhone, setCustomerPhone] = useState(user?.phone || '+998 90 ');
  const [region, setRegion] = useState(user?.region || 'Toshkent shahri');
  const [city, setCity] = useState(user?.city || 'Toshkent');
  const [address, setAddress] = useState(user?.address || '');
  const [note, setNote] = useState('');
  const [location, setLocation] = useState<LocationCoords | undefined>(user?.location);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('CLICK_CARD');
  const [copiedCard, setCopiedCard] = useState(false);

  const [isMapModalOpen, setIsMapModalOpen] = useState(false);
  const [submittingOrder, setSubmittingOrder] = useState(false);
  const [confirmedOrder, setConfirmedOrder] = useState<Order | null>(null);

  const activeCardNumber = settings?.cardSettings?.cardNumber || '9860 3501 2458 7789';
  const activeCardHolder = settings?.cardSettings?.cardHolder || 'SHU BREND MCHJ';
  const activeBankName = settings?.cardSettings?.bankName || 'Kapitalbank ATB';
  const activeTelegramHandle = settings?.cardSettings?.telegramUsername || '@shubrend_admin';
  const cleanTelegramUsername = activeTelegramHandle.replace('@', '');

  const handleCopyCard = (num: string) => {
    navigator.clipboard.writeText(num.replace(/\s+/g, ''));
    setCopiedCard(true);
    showToast('Karta raqami nusxalandi!', 'success');
    setTimeout(() => setCopiedCard(false), 2500);
  };

  // Discount calculation
  const discountAmount = cartTotal > 2000000 ? 150000 : 0;
  const deliveryFee = 0; // Free delivery
  const finalTotal = Math.max(0, cartTotal - discountAmount + deliveryFee);

  const handleOrderSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (cart.length === 0) return;

    if (!customerName.trim() || !customerPhone.trim() || customerPhone.length < 9) {
      showToast('Iltimos, ismingiz va to‘liq telefon raqamingizni kiriting', 'error');
      return;
    }

    setSubmittingOrder(true);
    try {
      const orderPayload = {
        userId: user?.id,
        customerName: customerName.trim(),
        customerPhone: customerPhone.trim(),
        region,
        city,
        address: address.trim() || (location?.address || 'Yetkazib berish manzili'),
        location,
        note: note.trim(),
        paymentMethod,
        items: cart.map((c) => ({
          productId: c.productId,
          productName: c.product.name,
          productImage: c.product.images[0],
          categoryName: c.product.categoryName,
          size: c.size,
          color: c.color,
          quantity: c.quantity,
          unitPrice: c.unitPrice,
        })),
      };

      const created = await api.createOrder(orderPayload);
      clearCart();
      setConfirmedOrder(created);

      confetti({
        particleCount: 90,
        spread: 75,
        origin: { y: 0.6 },
        colors: ['#d4af37', '#ffffff', '#e6c86e'],
      });
      showToast('Buyurtmangiz muvaffaqiyatli qabul qilindi!', 'success');
    } catch (err: any) {
      showToast(err.message || 'Buyurtma berishda xatolik yuz berdi', 'error');
    } finally {
      setSubmittingOrder(false);
    }
  };

  // If order is successfully completed, show success screen
  if (confirmedOrder) {
    const payLabel =
      confirmedOrder.paymentMethod === 'PAYNET_CARD'
        ? 'Paynet orqali kartaga o‘tkazma'
        : 'Click orqali kartaga o‘tkazma';

    return (
      <div className="min-h-[70vh] flex items-center justify-center px-4 py-12">
        <div className="max-w-lg w-full bg-[#131b2a] border border-[#d4af37]/40 rounded-3xl p-6 sm:p-8 text-center shadow-2xl space-y-5">
          <div className="w-16 h-16 rounded-full bg-[#d4af37]/15 text-[#d4af37] flex items-center justify-center mx-auto border border-[#d4af37]/40">
            <CheckCircle2 className="w-9 h-9" />
          </div>

          <div>
            <span className="text-xs font-bold text-[#d4af37] uppercase tracking-widest block mb-1">
              Muvaffaqiyatli qabul qilindi
            </span>
            <h2 className="text-2xl font-black text-white">Rahmat! Buyurtmangiz rasmiylashtirildi</h2>
            <p className="text-xs sm:text-sm text-slate-300 mt-1">
              Buyurtma raqamingiz:{' '}
              <strong className="text-amber-400 font-mono text-base">{confirmedOrder.orderNumber}</strong>
            </p>
          </div>

          {/* Payment Card Box (HUMO Card details as required) */}
          <div className="p-4 rounded-2xl bg-gradient-to-br from-slate-900 to-slate-950 border border-[#d4af37]/50 text-left space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <span className="text-xs font-bold text-[#d4af37] flex items-center gap-1.5 uppercase tracking-wider">
                <CreditCard className="w-4 h-4 text-[#d4af37]" />
                <span>To‘lov ma'lumotlari (HUMO)</span>
              </span>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300">
                🟡 To‘lov kutilmoqda
              </span>
            </div>

            <div className="bg-slate-900 p-3 rounded-xl border border-slate-800 flex items-center justify-between gap-3">
              <div>
                <span className="text-[10px] text-slate-400 block">HUMO Karta raqami:</span>
                <span className="text-base sm:text-lg font-mono font-black text-white tracking-wider">
                  {activeCardNumber}
                </span>
                <span className="text-[11px] text-slate-400 block mt-0.5">
                  {activeCardHolder} • {activeBankName}
                </span>
              </div>
              <button
                type="button"
                onClick={() => handleCopyCard(activeCardNumber)}
                className="px-3 py-2 rounded-xl bg-[#d4af37]/15 hover:bg-[#d4af37]/25 text-[#d4af37] font-bold text-xs flex items-center gap-1.5 border border-[#d4af37]/30 transition cursor-pointer"
              >
                {copiedCard ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedCard ? 'Nusxalandi' : 'Nusxa olish'}</span>
              </button>
            </div>

            <div className="text-xs text-slate-300 space-y-1">
              <p className="flex justify-between">
                <span className="text-slate-400">To‘lanadigan summa:</span>
                <strong className="text-amber-400 text-sm font-black">{formatUzbekPrice(confirmedOrder.total)}</strong>
              </p>
              <p className="text-[11px] text-slate-400 pt-1">
                ℹ️ To‘lovni amalga oshirgach, chekni administratorimiz Telegramiga yuboring. Administrator pul hisob raqamga tushganini tekshirgach, buyurtmangiz zudlik bilan yo‘lga chiqariladi.
              </p>
            </div>

            <a
              href={`https://t.me/${cleanTelegramUsername}`}
              target="_blank"
              rel="noreferrer"
              className="w-full py-2.5 rounded-xl bg-[#0088cc]/20 hover:bg-[#0088cc]/30 text-[#0088cc] border border-[#0088cc]/40 font-bold text-xs flex items-center justify-center gap-2 transition"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>To‘lov chekini Telegramga yuborish ({activeTelegramHandle})</span>
            </a>
          </div>

          {/* Order Summary */}
          <div className="p-4 rounded-2xl bg-slate-900 text-left text-xs space-y-2 border border-slate-800">
            <div className="flex justify-between">
              <span className="text-slate-400">Qabul qiluvchi:</span>
              <span className="text-white font-bold">{confirmedOrder.customerName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Telefon:</span>
              <span className="text-white font-bold">{confirmedOrder.customerPhone}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Yetkazish manzili:</span>
              <span className="text-white font-bold truncate max-w-[200px]">{confirmedOrder.address}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Tanlangan to‘lov:</span>
              <span className="text-[#d4af37] font-bold">{payLabel}</span>
            </div>
          </div>

          <div className="flex flex-col gap-2.5 pt-2">
            <button
              onClick={() => {
                setActiveTab('profile');
                setConfirmedOrder(null);
              }}
              className="w-full py-3 rounded-xl gold-gradient-bg text-black font-extrabold text-xs shadow-lg flex items-center justify-center gap-2 cursor-pointer"
            >
              <Clock className="w-4 h-4" />
              <span>Buyurtmalarim bo‘limiga o‘tish</span>
            </button>
            <button
              onClick={() => {
                setActiveTab('clothing');
                setConfirmedOrder(null);
              }}
              className="w-full py-2.5 rounded-xl bg-slate-800 text-slate-300 hover:text-white font-bold text-xs cursor-pointer"
            >
              Do‘konga qaytish
            </button>
          </div>
        </div>
      </div>
    );
  }


  // Empty cart view
  if (cart.length === 0) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center px-4 py-16 text-center">
        <div className="w-20 h-20 rounded-2xl bg-slate-900 border border-slate-800 text-slate-500 flex items-center justify-center mb-4">
          <ShoppingBag className="w-10 h-10" />
        </div>
        <h2 className="text-2xl font-black text-white">Savatingiz hozircha bo‘sh</h2>
        <p className="text-xs sm:text-sm text-slate-400 max-w-sm mt-1 mb-6">
          Sizga ma’qul kelgan sifatli va bejirim erkaklar kiyimlarini tanlab savatga qo‘shing.
        </p>
        <button
          onClick={() => setActiveTab('clothing')}
          className="px-6 py-3 rounded-xl gold-gradient-bg text-black font-extrabold text-xs tracking-wider uppercase shadow-lg shadow-[#d4af37]/20 flex items-center gap-2 cursor-pointer hover:brightness-110 active:scale-95 transition"
        >
          <span>Kolleksiyaga o‘tish</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-24 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 sm:pt-10">
      {/* Title */}
      <div className="flex items-center justify-between mb-8 pb-4 border-b border-slate-800">
        <div>
          <span className="text-xs font-bold text-[#d4af37] tracking-widest uppercase block mb-1">
            Xarid savatchasi
          </span>
          <h1 className="text-2xl sm:text-3xl font-black text-white">
            Savat <span className="text-slate-400 font-normal text-lg">({cart.length} ta mahsulot)</span>
          </h1>
        </div>
        <button
          onClick={clearCart}
          className="text-xs text-rose-400 hover:underline flex items-center gap-1 cursor-pointer"
        >
          <Trash2 className="w-3.5 h-3.5" />
          <span>Savatni tozalash</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12">
        {/* Left: Cart Items List (Screenshot 4) */}
        <div className="lg:col-span-7 space-y-4">
          {cart.map((item) => (
            <div
              key={item.id}
              className="bg-[#131b2a] rounded-2xl p-4 border border-slate-800/80 flex items-center gap-4 relative shadow-sm hover:border-slate-700 transition"
            >
              {/* Image */}
              <div className="w-20 h-24 sm:w-24 sm:h-28 rounded-xl overflow-hidden bg-slate-900 shrink-0">
                <img
                  src={item.product.images[0]}
                  alt={item.product.name}
                  className="w-full h-full object-cover"
                />
              </div>

              {/* Item Details */}
              <div className="flex-1 min-w-0 pr-6">
                <span className="text-[10px] uppercase font-bold text-[#d4af37]">
                  {item.product.categoryName}
                </span>
                <h3 className="text-sm sm:text-base font-bold text-white truncate">
                  {item.product.name}
                </h3>
                <div className="flex items-center gap-2 mt-1">
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-800 text-slate-300">
                    {item.size}
                  </span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-800 text-slate-300">
                    {item.color}
                  </span>
                </div>

                {/* Price & Quantity Controls */}
                <div className="mt-3 flex items-center justify-between gap-2">
                  <span className="text-sm sm:text-base font-black text-white">
                    {formatUzbekPrice(item.unitPrice)}
                  </span>

                  {/* Quantity */}
                  <div className="flex items-center bg-slate-900 rounded-lg border border-slate-700 p-0.5">
                    <button
                      onClick={() => updateQuantity(item.id, -1)}
                      className="p-1 rounded text-slate-400 hover:text-white transition"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                    <span className="w-7 text-center font-bold text-xs text-white">
                      {item.quantity}
                    </span>
                    <button
                      onClick={() => updateQuantity(item.id, 1)}
                      className="p-1 rounded text-slate-400 hover:text-white transition"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Remove item button */}
              <button
                onClick={() => removeFromCart(item.id)}
                className="absolute top-3.5 right-3.5 p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition cursor-pointer"
                title="O‘chirish"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>

        {/* Right: Checkout and Order Summary (Screenshot 4) */}
        <div className="lg:col-span-5">
          <div className="bg-[#131b2a] rounded-3xl p-6 border border-slate-800 sticky top-28 shadow-xl">
            <h3 className="text-base font-bold text-white mb-4 pb-3 border-b border-slate-800">
              Buyurtma xulosasi
            </h3>

            {/* Calculations */}
            <div className="space-y-3 text-xs sm:text-sm">
              <div className="flex justify-between text-slate-400">
                <span>Jami mahsulotlar:</span>
                <span className="text-white font-medium">{formatUzbekPrice(cartTotal)}</span>
              </div>

              {discountAmount > 0 && (
                <div className="flex justify-between text-rose-400 font-medium">
                  <span>Chegirma:</span>
                  <span>- {formatUzbekPrice(discountAmount)}</span>
                </div>
              )}

              <div className="flex justify-between text-slate-400">
                <span>Yetkazib berish:</span>
                <span className="text-emerald-400 font-bold">Bepul</span>
              </div>

              <div className="pt-3 border-t border-slate-800 flex justify-between items-baseline">
                <span className="text-sm font-bold text-white">Umumiy summa:</span>
                <span className="text-xl sm:text-2xl font-black text-[#d4af37]">
                  {formatUzbekPrice(finalTotal)}
                </span>
              </div>
            </div>

            {/* Delivery address & customer inputs */}
            <form onSubmit={handleOrderSubmit} className="mt-6 pt-5 border-t border-slate-800 space-y-3.5">
              <h4 className="text-xs font-bold uppercase tracking-wider text-[#d4af37] flex items-center gap-1.5">
                <UserIcon className="w-3.5 h-3.5" />
                <span>Yetkazib berish ma‘lumotlari</span>
              </h4>

              {/* Ism */}
              <div>
                <label className="text-[11px] text-slate-400 block mb-1">Ismingiz *</label>
                <input
                  type="text"
                  required
                  placeholder="Masalan: Abdulaziz"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-900 text-xs text-white rounded-xl border border-slate-700 focus:border-[#d4af37] focus:outline-none"
                />
              </div>

              {/* Telefon */}
              <div>
                <label className="text-[11px] text-slate-400 block mb-1">Telefon raqamingiz *</label>
                <input
                  type="tel"
                  required
                  placeholder="+998 90 123 45 67"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-900 text-xs text-white rounded-xl border border-slate-700 focus:border-[#d4af37] focus:outline-none font-mono"
                />
              </div>

              {/* Viloyat & Shahar */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[11px] text-slate-400 block mb-1">Viloyat</label>
                  <select
                    value={region}
                    onChange={(e) => setRegion(e.target.value)}
                    className="w-full px-2.5 py-2 bg-slate-900 text-xs text-white rounded-xl border border-slate-700 focus:border-[#d4af37] focus:outline-none"
                  >
                    <option value="Toshkent shahri">Toshkent shahri</option>
                    <option value="Toshkent viloyati">Toshkent viloyati</option>
                    <option value="Samarqand viloyati">Samarqand viloyati</option>
                    <option value="Farg‘ona viloyati">Farg‘ona viloyati</option>
                    <option value="Andijon viloyati">Andijon viloyati</option>
                    <option value="Namangan viloyati">Namangan viloyati</option>
                    <option value="Buxoro viloyati">Buxoro viloyati</option>
                    <option value="Qashqadaryo viloyati">Qashqadaryo viloyati</option>
                    <option value="Xorazm viloyati">Xorazm viloyati</option>
                  </select>
                </div>
                <div>
                  <label className="text-[11px] text-slate-400 block mb-1">Shahar / Tuman</label>
                  <input
                    type="text"
                    placeholder="Yunusobod tumani"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-900 text-xs text-white rounded-xl border border-slate-700 focus:border-[#d4af37] focus:outline-none"
                  />
                </div>
              </div>

              {/* Aniq manzil */}
              <div>
                <label className="text-[11px] text-slate-400 block mb-1">Manzil (ko‘cha, uy, xonadon)</label>
                <input
                  type="text"
                  placeholder="5-mavze, 14-uy, 22-xonadon"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-900 text-xs text-white rounded-xl border border-slate-700 focus:border-[#d4af37] focus:outline-none"
                />
              </div>

              {/* Interactive Map Location Trigger (Requirement 10) */}
              <div className="pt-1">
                <button
                  type="button"
                  onClick={() => setIsMapModalOpen(true)}
                  className="w-full py-2 px-3 rounded-xl border border-dashed border-[#d4af37]/60 hover:bg-[#d4af37]/10 text-[#d4af37] text-xs font-bold flex items-center justify-center gap-2 transition cursor-pointer"
                >
                  <MapPin className="w-4 h-4" />
                  <span>
                    {location?.address
                      ? `Xaritadan belgilandi: ${location.address.slice(0, 24)}...`
                      : 'Xaritadan lokatsiyani tanlash (GPS)'}
                  </span>
                </button>
              </div>

              {/* Izoh */}
              <div>
                <label className="text-[11px] text-slate-400 block mb-1">Buyurtmaga izoh (ixtiyoriy)</label>
                <input
                  type="text"
                  placeholder="Masalan: Domofon kodi 45, kechki payt olib keling"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-900 text-xs text-white rounded-xl border border-slate-700 focus:border-[#d4af37] focus:outline-none"
                />
              </div>

              {/* Payment Method Selector (Requirement 3: Faqat Click va Paynet kartaga o‘tkazma) */}
              <div className="pt-2">
                <label className="text-xs font-bold uppercase tracking-wider text-[#d4af37] flex items-center gap-1.5 mb-2.5">
                  <CreditCard className="w-3.5 h-3.5" />
                  <span>To‘lov usuli (Kartaga o‘tkazma) *</span>
                </label>

                <div className="space-y-2">
                  {/* Click Card */}
                  <label
                    onClick={() => setPaymentMethod('CLICK_CARD')}
                    className={`flex items-center justify-between p-3.5 rounded-2xl border cursor-pointer transition ${
                      paymentMethod === 'CLICK_CARD'
                        ? 'border-[#00c0f3] bg-[#00c0f3]/10 shadow-sm'
                        : 'border-slate-800 bg-slate-900/60 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-[#00c0f3]/20 flex items-center justify-center font-black text-[#00c0f3] text-xs">
                        CLICK
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-white">Click orqali kartaga o‘tkazma</span>
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-[#00c0f3]/20 text-[#00c0f3]">
                            HUMO
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-400">Click ilovasidan HUMO kartaga o‘tkazish</p>
                      </div>
                    </div>
                    <div
                      className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                        paymentMethod === 'CLICK_CARD' ? 'border-[#00c0f3] bg-[#00c0f3]' : 'border-slate-600'
                      }`}
                    >
                      {paymentMethod === 'CLICK_CARD' && <Check className="w-2.5 h-2.5 text-black stroke-[3]" />}
                    </div>
                  </label>

                  {/* Paynet Card */}
                  <label
                    onClick={() => setPaymentMethod('PAYNET_CARD')}
                    className={`flex items-center justify-between p-3.5 rounded-2xl border cursor-pointer transition ${
                      paymentMethod === 'PAYNET_CARD'
                        ? 'border-emerald-500 bg-emerald-500/10 shadow-sm'
                        : 'border-slate-800 bg-slate-900/60 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center font-black text-emerald-400 text-xs">
                        PAYNET
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-white">Paynet orqali kartaga o‘tkazma</span>
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-500/20 text-emerald-400">
                            HUMO
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-400">Paynet ilovasi yoki infokiosklar orqali kartaga to‘lov</p>
                      </div>
                    </div>
                    <div
                      className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                        paymentMethod === 'PAYNET_CARD' ? 'border-emerald-500 bg-emerald-500' : 'border-slate-600'
                      }`}
                    >
                      {paymentMethod === 'PAYNET_CARD' && <Check className="w-2.5 h-2.5 text-black stroke-[3]" />}
                    </div>
                  </label>
                </div>

                {/* Card Transfer Instructions box in form */}
                <div className="mt-3 p-3.5 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">HUMO Karta:</span>
                      <span className="font-mono font-bold text-white text-sm">{activeCardNumber}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleCopyCard(activeCardNumber)}
                      className="px-2.5 py-1.5 rounded-lg bg-[#d4af37]/15 hover:bg-[#d4af37]/25 text-[#d4af37] font-bold text-[11px] flex items-center gap-1 border border-[#d4af37]/30 transition cursor-pointer"
                    >
                      {copiedCard ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                      <span>{copiedCard ? 'Nusxalandi' : 'Nusxa'}</span>
                    </button>
                  </div>
                  <div className="text-[10px] text-slate-400 flex items-center justify-between border-t border-slate-800/80 pt-1.5">
                    <span>Egasi: <strong className="text-slate-300">{activeCardHolder}</strong></span>
                    <span>Admin Telegram: <strong className="text-[#0088cc]">{activeTelegramHandle}</strong></span>
                  </div>
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={submittingOrder}
                className="w-full mt-4 py-3.5 rounded-xl gold-gradient-bg text-black font-black text-sm tracking-wide uppercase shadow-lg shadow-[#d4af37]/25 hover:brightness-110 active:scale-98 transition flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
              >
                {submittingOrder ? (
                  <span>Buyurtma rasmiylashtirilmoqda...</span>
                ) : (
                  <>
                    <span>Buyurtma berish</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* Map Picker Modal */}
      <MapPickerModal
        isOpen={isMapModalOpen}
        onClose={() => setIsMapModalOpen(false)}
        onSelectLocation={(coords) => {
          setLocation(coords);
          if (coords.address && !address) {
            setAddress(coords.address);
          }
          showToast('Lokatsiya muvaffaqiyatli tanlandi! 📍', 'success');
        }}
        initialCoords={location}
      />
    </div>
  );
};

