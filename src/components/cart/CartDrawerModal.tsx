import React, { useState, useEffect } from 'react';
import {
  X,
  ShoppingCart,
  Trash2,
  Plus,
  Minus,
  MapPin,
  Phone,
  Truck,
  Building2,
  CheckCircle2,
  ArrowRight,
  ExternalLink,
  Sparkles,
} from 'lucide-react';
import { useCart } from '../../context/CartContext';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { supabaseData } from '../../services/supabase';
import { Order } from '../../types';

interface CartDrawerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CartDrawerModal: React.FC<CartDrawerModalProps> = ({ isOpen, onClose }) => {
  const {
    items,
    currentUnit,
    removeItem,
    updateQuantity,
    clearCart,
    subtotal,
    deliveryFee,
    total,
    deliveryMode,
    setDeliveryMode,
    checkoutOrder,
    generateWhatsAppLink,
  } = useCart();

  const { currentUser } = useAuth();
  const { warning } = useToast();

  const isDepotCart = currentUnit?.tipo === 'deposito';
  const userUnit = currentUser?.unidade_id ? supabaseData.getUnitById(currentUser.unidade_id) : null;

  const [nome, setNome] = useState(() => {
    if (isDepotCart && userUnit?.nome) return userUnit.nome;
    return currentUser?.nome || '';
  });
  const [telefone, setTelefone] = useState(() => {
    if (isDepotCart && userUnit?.telefone) return userUnit.telefone;
    return currentUser?.telefone || '+244 9';
  });
  const [whatsapp, setWhatsapp] = useState(() => {
    if (isDepotCart && userUnit?.whatsapp) return userUnit.whatsapp;
    return currentUser?.whatsapp || '+244 9';
  });
  const [endereco, setEndereco] = useState(() => {
    if (isDepotCart && userUnit?.endereco_completo) return userUnit.endereco_completo;
    return '';
  });
  const [mensagem, setMensagem] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [confirmedOrder, setConfirmedOrder] = useState<Order | null>(null);

  // Sync defaults if switching to depot
  useEffect(() => {
    if (isDepotCart && userUnit) {
      if (!nome) setNome(userUnit.nome);
      if (!endereco) setEndereco(userUnit.endereco_completo);
      if (userUnit.telefone && telefone === '+244 9') setTelefone(userUnit.telefone);
      if (userUnit.whatsapp && whatsapp === '+244 9') setWhatsapp(userUnit.whatsapp);
    }
  }, [isDepotCart, userUnit]);

  if (!isOpen) return null;

  const handleCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nome || !telefone) {
      warning('Por favor preencha o seu nome e telefone de contacto.');
      return;
    }

    if (deliveryMode === 'entrega' && !endereco) {
      warning('Por favor indique o endereço para entrega em Luanda / província.');
      return;
    }

    setIsSubmitting(true);
    try {
      const order = await checkoutOrder({
        nome,
        telefone,
        whatsapp: whatsapp || telefone,
        endereco_entrega: endereco,
        mensagem_unidade: mensagem,
      });
      if (order) {
        setConfirmedOrder(order);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenWhatsApp = () => {
    if (!confirmedOrder || !currentUnit) return;
    const link = generateWhatsAppLink(confirmedOrder, currentUnit.whatsapp || currentUnit.telefone);
    window.open(link, '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/50 backdrop-blur-sm animate-in fade-in">
      <div className="w-full max-w-lg bg-white border-l border-gray-100 h-full flex flex-col justify-between shadow-2xl text-gray-800 animate-in slide-in-from-right duration-300">
        {/* Header */}
        <div className="p-6 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shadow-sm ${
              isDepotCart ? 'bg-amber-100 text-amber-800' : 'bg-[#E8F5F1] text-[#00A878]'
            }`}>
              <ShoppingCart className="w-5 h-5" />
            </div>
            <div>
              <span className={`inline-block px-2 py-0.5 text-[10px] font-black rounded-full uppercase tracking-wider mb-0.5 ${
                isDepotCart ? 'bg-amber-100 text-amber-900' : 'bg-[#E8F5F1] text-[#00A878]'
              }`}>
                {isDepotCart ? 'Depósito Grossista B2B' : 'Checkout Saúde'}
              </span>
              <h3 className="font-black text-[#123B7A] uppercase text-base tracking-tight">
                {isDepotCart ? 'Pedido de Abastecimento' : 'O Seu Pedido'}
              </h3>
              <p className="text-xs text-gray-500 font-medium">
                {items.length} {items.length === 1 ? (isDepotCart ? 'lote' : 'item') : (isDepotCart ? 'lotes' : 'itens')} no carrinho
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {confirmedOrder ? (
            /* Order Confirmation View */
            <div className="py-8 text-center space-y-5 animate-in zoom-in-95">
              <div className="w-16 h-16 rounded-full bg-[#E8F5F1] text-[#00A878] flex items-center justify-center mx-auto border border-[#00A878]/30 shadow-sm">
                <CheckCircle2 className="w-8 h-8" />
              </div>

              <div>
                <h3 className="text-xl font-black text-[#123B7A] uppercase tracking-tight">Pedido Criado com Sucesso!</h3>
                <p className="text-xs text-gray-500 mt-1">
                  Código de Referência: <strong className="text-[#00A878] text-sm font-black">#{confirmedOrder.codigo_pedido}</strong>
                </p>
              </div>

              <div className="p-5 rounded-2xl bg-gray-50 border border-gray-100 text-left text-xs space-y-2.5">
                <div className="flex justify-between text-gray-600">
                  <span>Farmácia / Unidade:</span>
                  <strong className="text-[#123B7A] font-bold">{confirmedOrder.unidade_nome}</strong>
                </div>
                <div className="flex justify-between text-gray-600">
                  <span>Modalidade:</span>
                  <strong className="capitalize text-[#123B7A] font-bold">{confirmedOrder.modalidade}</strong>
                </div>
                <div className="flex justify-between text-gray-600 pt-2 border-t border-gray-200">
                  <span className="font-bold">Valor Total:</span>
                  <strong className="text-[#00A878] text-base font-black">{confirmedOrder.total.toLocaleString()} AOA</strong>
                </div>
              </div>

              <div className="space-y-2.5 pt-2">
                <button
                  type="button"
                  onClick={handleOpenWhatsApp}
                  className="w-full py-4 rounded-2xl bg-[#00A878] hover:bg-[#008f66] text-white font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer"
                >
                  <Phone className="w-4 h-4" />
                  <span>Enviar Pedido Directo pelo WhatsApp</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setConfirmedOrder(null);
                    onClose();
                  }}
                  className="w-full py-3 rounded-2xl bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-xs uppercase tracking-wider transition-colors"
                >
                  Continuar a Navegar
                </button>
              </div>
            </div>
          ) : items.length === 0 ? (
            /* Empty Cart View */
            <div className="py-16 text-center space-y-4">
              <div className="w-16 h-16 rounded-2xl bg-gray-100 text-gray-400 flex items-center justify-center mx-auto">
                <ShoppingCart className="w-8 h-8" />
              </div>
              <h4 className="font-black text-[#123B7A] uppercase text-base tracking-tight">O seu carrinho está vazio</h4>
              <p className="text-xs text-gray-500 max-w-xs mx-auto font-medium">
                Explore as farmácias credenciadas ou utilize a busca para adicionar medicamentos e serviços médicos.
              </p>
            </div>
          ) : (
            /* Active Items List & Checkout Form */
            <div className="space-y-6">
              {/* Unit Info Header */}
              {currentUnit && (
                <div className="p-4 rounded-2xl bg-gray-50 border border-gray-100 flex items-center gap-3">
                  <Building2 className="w-5 h-5 text-[#123B7A] shrink-0" />
                  <div className="min-w-0">
                    <div className="text-xs font-black text-[#123B7A] uppercase truncate">{currentUnit.nome}</div>
                    <div className="text-[11px] text-gray-500 font-medium truncate">{currentUnit.endereco_completo}</div>
                  </div>
                </div>
              )}

              {/* Items */}
              <div className="space-y-3">
                {items.map((item) => (
                  <div
                    key={item.id}
                    className="p-4 rounded-2xl bg-gray-50 border border-gray-100 flex items-center justify-between gap-3"
                  >
                    <div className="flex-1 min-w-0">
                      <h4 className="font-black text-sm text-[#123B7A] uppercase truncate">{item.nome}</h4>
                      <div className="text-xs text-[#00A878] font-black mt-0.5">
                        {item.preco.toLocaleString()} AOA
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-1 bg-white border border-gray-200 rounded-xl p-1 shadow-sm">
                        <button
                          onClick={() => updateQuantity(item.id, item.quantidade - 1)}
                          className="p-1 text-gray-500 hover:text-gray-900 rounded"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="text-xs font-black px-2 text-[#123B7A]">{item.quantidade}</span>
                        <button
                          onClick={() => updateQuantity(item.id, item.quantidade + 1)}
                          className="p-1 text-gray-500 hover:text-gray-900 rounded"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>

                      <button
                        onClick={() => removeItem(item.id)}
                        className="p-2 text-gray-400 hover:text-rose-500 transition-colors"
                        title="Remover"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Delivery Mode Toggle */}
              <div className="space-y-2">
                <label className="text-xs font-black text-[#123B7A] uppercase tracking-wider">
                  {isDepotCart ? 'Modalidade de Recepção do Lote' : 'Modalidade de Obtenção'}
                </label>
                <div className="grid grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={() => setDeliveryMode('levantamento')}
                    className={`p-3.5 rounded-2xl border text-xs font-black flex flex-col items-center gap-1 transition-all ${
                      deliveryMode === 'levantamento'
                        ? isDepotCart
                          ? 'bg-amber-50 border-amber-500 text-amber-900 shadow-sm'
                          : 'bg-[#E8F5F1] border-[#00A878] text-[#00A878] shadow-sm'
                        : 'bg-gray-50 border-gray-200 text-gray-500 hover:text-gray-800'
                    }`}
                  >
                    <Building2 className="w-4 h-4 text-[#123B7A]" />
                    <span className="uppercase tracking-wider">{isDepotCart ? 'Levantamento no Depósito' : 'Levantamento'}</span>
                    <span className="text-[10px] text-[#00A878] font-bold">Grátis no armazém</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setDeliveryMode('entrega')}
                    className={`p-3.5 rounded-2xl border text-xs font-black flex flex-col items-center gap-1 transition-all ${
                      deliveryMode === 'entrega'
                        ? isDepotCart
                          ? 'bg-amber-50 border-amber-500 text-amber-900 shadow-sm'
                          : 'bg-[#E8F5F1] border-[#00A878] text-[#00A878] shadow-sm'
                        : 'bg-gray-50 border-gray-200 text-gray-500 hover:text-gray-800'
                    }`}
                  >
                    <Truck className="w-4 h-4 text-amber-500" />
                    <span className="uppercase tracking-wider">{isDepotCart ? 'Entrega Logística' : 'Entrega'}</span>
                    <span className="text-[10px] text-amber-600 font-bold">+1.500 AOA</span>
                  </button>
                </div>
              </div>

              {/* Patient / Buyer Pharmacy Form */}
              <form onSubmit={handleCheckout} id="cart-checkout-form" className="space-y-3.5 pt-2">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-700">
                    {isDepotCart ? 'Farmácia Solicitante / Responsável Comprador *' : 'O Seu Nome Completo *'}
                  </label>
                  <input
                    type="text"
                    required
                    value={nome}
                    onChange={(e) => setNome(e.target.value)}
                    placeholder={isDepotCart ? 'Ex: Farmácia Luanda Saúde Central (Dr. Manuel)' : 'Ex: Manuel Domingos'}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2.5 text-xs text-gray-800 placeholder-gray-400 focus:outline-none focus:border-[#00A878]"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-700">
                      {isDepotCart ? 'Telemóvel Comercial *' : 'Telemóvel *'}
                    </label>
                    <input
                      type="tel"
                      required
                      value={telefone}
                      onChange={(e) => setTelefone(e.target.value)}
                      placeholder="+244 923 000 000"
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2.5 text-xs text-gray-800 placeholder-gray-400 focus:outline-none focus:border-[#00A878]"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-700">
                      {isDepotCart ? 'WhatsApp para Lote' : 'WhatsApp'}
                    </label>
                    <input
                      type="tel"
                      value={whatsapp}
                      onChange={(e) => setWhatsapp(e.target.value)}
                      placeholder="+244 923 000 000"
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2.5 text-xs text-gray-800 placeholder-gray-400 focus:outline-none focus:border-[#00A878]"
                    />
                  </div>
                </div>

                {deliveryMode === 'entrega' && (
                  <div className="space-y-1 animate-in fade-in">
                    <label className="text-xs font-bold text-gray-700">
                      {isDepotCart ? 'Endereço da Farmácia / Ponto de Descarga *' : 'Endereço de Entrega em Luanda / Província *'}
                    </label>
                    <input
                      type="text"
                      required
                      value={endereco}
                      onChange={(e) => setEndereco(e.target.value)}
                      placeholder="Bairro, Rua, Edifício / Ponto de Referência"
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2.5 text-xs text-gray-800 placeholder-gray-400 focus:outline-none focus:border-[#00A878]"
                    />
                  </div>
                )}

                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-700">
                    {isDepotCart ? 'Observações B2B (NIF para Faturação, Lote, Validade...)' : 'Nota ou Instrução para a Farmácia (Opcional)'}
                  </label>
                  <textarea
                    rows={2}
                    value={mensagem}
                    onChange={(e) => setMensagem(e.target.value)}
                    placeholder={isDepotCart ? 'Ex: NIF: 5000123456, solicitar faturado em nome da farmácia...' : 'Ex: Favor confirmar dosagem pediátrica...'}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2.5 text-xs text-gray-800 placeholder-gray-400 focus:outline-none focus:border-[#00A878] resize-none"
                  />
                </div>
              </form>
            </div>
          )}
        </div>

        {/* Footer Summary & Action */}
        {!confirmedOrder && items.length > 0 && (
          <div className="p-6 border-t border-gray-100 bg-[#F8FAFC] space-y-3.5">
            <div className="space-y-1.5 text-xs text-gray-600">
              <div className="flex justify-between">
                <span>{isDepotCart ? 'Subtotal Lotes Grossistas:' : 'Subtotal Itens:'}</span>
                <span className="font-bold text-gray-800">{subtotal.toLocaleString()} AOA</span>
              </div>
              {deliveryFee > 0 && (
                <div className="flex justify-between text-amber-600 font-bold">
                  <span>{isDepotCart ? 'Taxa Logística / Transporte:' : 'Taxa de Entrega:'}</span>
                  <span>+{deliveryFee.toLocaleString()} AOA</span>
                </div>
              )}
              <div className="flex justify-between text-base font-black text-[#123B7A] pt-2 border-t border-gray-200">
                <span>TOTAL A PAGAR:</span>
                <span className="text-[#00A878] text-lg">{total.toLocaleString()} AOA</span>
              </div>
            </div>

            <button
              type="submit"
              form="cart-checkout-form"
              disabled={isSubmitting}
              className={`w-full py-4 rounded-2xl text-white font-black text-xs uppercase tracking-wider shadow-md flex items-center justify-center gap-2 active:scale-98 transition-all disabled:opacity-50 cursor-pointer ${
                isDepotCart ? 'bg-[#007A58] hover:bg-[#006246]' : 'bg-[#123B7A] hover:bg-[#0d2a59]'
              }`}
            >
              <span>{isDepotCart ? 'Confirmar Pedido de Abastecimento B2B' : 'Confirmar Pedido'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
