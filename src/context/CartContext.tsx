import React, { createContext, useContext, useState, useEffect } from 'react';
import { CartItem, HealthUnit, Order, DeliveryMode } from '../types';
import { supabaseData } from '../services/supabase';
import { useToast } from './ToastContext';
import { useAuth } from './AuthContext';

interface CartContextType {
  items: CartItem[];
  currentUnit: HealthUnit | null;
  addItem: (item: Omit<CartItem, 'id' | 'subtotal'> & { unidade_id: string }, forceReplace?: boolean) => boolean;
  removeItem: (itemId: string) => void;
  updateQuantity: (itemId: string, qty: number) => void;
  clearCart: () => void;
  totalItemsCount: number;
  subtotal: number;
  deliveryFee: number;
  total: number;
  deliveryMode: DeliveryMode;
  setDeliveryMode: (mode: DeliveryMode) => void;
  checkoutOrder: (patientDetails: {
    nome: string;
    telefone: string;
    whatsapp: string;
    email?: string;
    endereco_entrega?: string;
    mensagem_unidade?: string;
    receita_url?: string;
  }) => Promise<Order | null>;
  generateWhatsAppLink: (order: Order, unitWhatsApp: string) => string;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

const CART_STORAGE_KEY = 'mutikukwama_cart_v1';

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [items, setItems] = useState<CartItem[]>(() => {
    if (typeof window === 'undefined') return [];
    try {
      const saved = localStorage.getItem(CART_STORAGE_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [deliveryMode, setDeliveryMode] = useState<DeliveryMode>('levantamento');
  const { toast, success, warning, error } = useToast();
  const { currentUser } = useAuth();

  useEffect(() => {
    try {
      localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
    } catch (e) {
      console.warn('Could not save cart to storage:', e);
    }
  }, [items]);

  // Determine which unit the current cart belongs to
  const currentUnitId = items.length > 0 ? items[0].unidade_id : null;
  const currentUnit = currentUnitId ? supabaseData.getUnitById(currentUnitId) || null : null;

  const addItem = (
    item: Omit<CartItem, 'id' | 'subtotal'> & { unidade_id: string },
    forceReplace: boolean = false
  ): boolean => {
    // Check if adding from another unit
    if (items.length > 0 && items[0].unidade_id !== item.unidade_id) {
      const existingUnitName = items[0].unidade_nome || 'outra unidade';
      const newUnitName = item.unidade_nome || 'nova unidade';
      
      let confirmSwitch = forceReplace;
      if (!confirmSwitch) {
        try {
          confirmSwitch = window.confirm(
            `O seu carrinho já contém produtos de "${existingUnitName}". Deseja substituir pelos itens de "${newUnitName}"?`
          );
        } catch {
          // If window.confirm is restricted in iframe, default to allowing replacement
          confirmSwitch = true;
        }
      }

      if (!confirmSwitch) {
        warning(`Manteve os itens de ${existingUnitName}.`, 'Carrinho Unificado');
        return false;
      }
      // Clear and proceed
      const newItem: CartItem = {
        ...item,
        id: 'citem-' + Date.now(),
        subtotal: item.preco * item.quantidade,
      };
      setItems([newItem]);
      success(`${item.nome} adicionado ao carrinho!`);
      return true;
    }

    // Check if item already in cart
    const existingIndex = items.findIndex(
      (i) => i.item_id === item.item_id && i.tipo_item === item.tipo_item
    );

    if (existingIndex >= 0) {
      const updated = [...items];
      const newQty = updated[existingIndex].quantidade + item.quantidade;
      updated[existingIndex] = {
        ...updated[existingIndex],
        quantidade: newQty,
        subtotal: updated[existingIndex].preco * newQty,
      };
      setItems(updated);
      success(`Quantidade de ${item.nome} atualizada (+${item.quantidade})`);
    } else {
      const newItem: CartItem = {
        ...item,
        id: 'citem-' + Date.now(),
        subtotal: item.preco * item.quantidade,
      };
      setItems([...items, newItem]);
      success(`${item.nome} adicionado ao carrinho!`);
    }

    return true;
  };

  const removeItem = (itemId: string) => {
    setItems((prev) => prev.filter((i) => i.id !== itemId));
    toast('Item removido do carrinho.', 'info');
  };

  const updateQuantity = (itemId: string, qty: number) => {
    if (qty <= 0) {
      removeItem(itemId);
      return;
    }
    setItems((prev) =>
      prev.map((i) => (i.id === itemId ? { ...i, quantidade: qty, subtotal: i.preco * qty } : i))
    );
  };

  const clearCart = () => {
    setItems([]);
  };

  const totalItemsCount = items.reduce((acc, i) => acc + i.quantidade, 0);
  const subtotal = items.reduce((acc, i) => acc + i.subtotal, 0);
  const config = supabaseData.getConfig();
  const deliveryFee = deliveryMode === 'entrega' && items.length > 0 ? (config.taxa_entrega_padrao || 1500) : 0;
  const total = subtotal + deliveryFee;

  const checkoutOrder = async (patientDetails: {
    nome: string;
    telefone: string;
    whatsapp: string;
    email?: string;
    endereco_entrega?: string;
    mensagem_unidade?: string;
    receita_url?: string;
  }): Promise<Order | null> => {
    if (items.length === 0) {
      error('O seu carrinho está vazio.');
      return null;
    }

    if (!currentUnit) {
      error('Unidade de saúde não identificada.');
      return null;
    }

    const newOrder = supabaseData.createOrder({
      paciente_id: currentUser?.id,
      paciente_nome: patientDetails.nome,
      paciente_telefone: patientDetails.telefone,
      paciente_whatsapp: patientDetails.whatsapp,
      paciente_email: patientDetails.email,
      unidade_id: currentUnit.id,
      unidade_nome: currentUnit.nome,
      itens: items.map((i) => ({
        id: 'orditem-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
        item_id: i.item_id,
        tipo_item: i.tipo_item,
        nome: i.nome,
        preco: i.preco,
        quantidade: i.quantidade,
        subtotal: i.subtotal,
      })),
      modalidade: deliveryMode,
      endereco_entrega: patientDetails.endereco_entrega,
      mensagem_unidade: patientDetails.mensagem_unidade,
      status: 'pendente',
      subtotal,
      taxa_entrega: deliveryFee,
      total,
      receita_url: patientDetails.receita_url,
    });

    // If ordered from a wholesale depot, also register in B2B supply orders for the depot & unit
    if (currentUnit.tipo === 'deposito') {
      try {
        supabaseData.createSupplyOrder({
          unidade_compradora_id: currentUser?.unidade_id || 'unit-1',
          deposito_fornecedor_id: currentUnit.id,
          itens: items.map((i) => ({
            id: 'suppitem-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
            produto_id: i.item_id,
            nome: i.nome,
            categoria: 'Medicamentos Grossistas',
            quantidade_caixas: i.quantidade,
            unidades_por_caixa: 50,
            preco_unitario_caixa: i.preco,
            subtotal: i.subtotal,
          })),
          notas: patientDetails.mensagem_unidade,
        });
      } catch (err) {
        console.warn('Could not auto-create B2B supply order record:', err);
      }
    }

    clearCart();
    success(
      `Pedido ${newOrder.codigo_pedido} enviado com sucesso para ${currentUnit.nome}!`,
      'Pedido Criado'
    );
    return newOrder;
  };

  const generateWhatsAppLink = (order: Order, unitWhatsApp: string): string => {
    const cleanPhone = unitWhatsApp.replace(/[^0-9]/g, '');

    // Format if ordering from a wholesale depot
    if (currentUnit?.tipo === 'deposito') {
      const itemsText = order.itens
        .map((item, idx) => `${idx + 1}. *${item.nome}* x${item.quantidade} caixa(s) - ${item.subtotal.toLocaleString()} AOA`)
        .join('\n');

      const message = `*📦 PEDIDO DE ABASTECIMENTO GROSSISTA B2B - MUTIKUKWAMA SAÚDE*\n` +
        `*Código do Pedido:* #${order.codigo_pedido}\n` +
        `*Depósito Grossista:* ${currentUnit.nome}\n` +
        `*Farmácia / Comprador:* ${order.paciente_nome}\n` +
        `*Contacto:* ${order.paciente_whatsapp || order.paciente_telefone}\n` +
        `*Modalidade:* ${order.modalidade === 'entrega' ? '🚚 Entrega Logística / Distribuição' : '🏬 Levantamento no Armazém'}\n` +
        (order.endereco_entrega ? `*Endereço de Destino:* ${order.endereco_entrega}\n` : '') +
        `\n*LOTES SOLICITADOS:*\n${itemsText}\n\n` +
        `*Subtotal:* ${order.subtotal.toLocaleString()} AOA\n` +
        (order.taxa_entrega > 0 ? `*Taxa Logística:* ${order.taxa_entrega.toLocaleString()} AOA\n` : '') +
        `*VALOR TOTAL:* *${order.total.toLocaleString()} AOA*\n` +
        (order.mensagem_unidade ? `\n*Observações/NIF:* ${order.mensagem_unidade}\n` : '') +
        `\n_Pedido emitido via Canal B2B da plataforma MUTIKUKWAMA SAÚDE_`;

      return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
    }

    const itemsText = order.itens
      .map((item, idx) => `${idx + 1}. *${item.nome}* x${item.quantidade} - ${item.subtotal.toLocaleString()} AOA`)
      .join('\n');

    const message = `*🏥 PEDIDO MUTIKUKWAMA SAÚDE*\n` +
      `*Código:* #${order.codigo_pedido}\n` +
      `*Paciente:* ${order.paciente_nome}\n` +
      `*Contacto:* ${order.paciente_whatsapp || order.paciente_telefone}\n` +
      `*Modalidade:* ${order.modalidade === 'entrega' ? '🚚 Entrega ao Domicílio' : '🏬 Levantamento no Local'}\n` +
      (order.endereco_entrega ? `*Endereço:* ${order.endereco_entrega}\n` : '') +
      `\n*ITENS SOLICITADOS:*\n${itemsText}\n\n` +
      `*Subtotal:* ${order.subtotal.toLocaleString()} AOA\n` +
      (order.taxa_entrega > 0 ? `*Taxa Entrega:* ${order.taxa_entrega.toLocaleString()} AOA\n` : '') +
      `*VALOR TOTAL:* *${order.total.toLocaleString()} AOA*\n` +
      (order.mensagem_unidade ? `\n*Nota:* ${order.mensagem_unidade}\n` : '') +
      `\n_Pedido gerado via plataforma MUTIKUKWAMA SAÚDE_`;

    return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
  };

  return (
    <CartContext.Provider
      value={{
        items,
        currentUnit,
        addItem,
        removeItem,
        updateQuantity,
        clearCart,
        totalItemsCount,
        subtotal,
        deliveryFee,
        total,
        deliveryMode,
        setDeliveryMode,
        checkoutOrder,
        generateWhatsAppLink,
      }}
    >
      {children}
    </CartContext.Provider>
  );
};

export const useCart = (): CartContextType => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};
