import { useState, createContext, useContext, ReactNode } from 'react';

type ModalName = 'fileAction' | 'groupManagement' | 'fileUpload';

type ModalContextType = {
  activeModal: ModalName | null;
  modalData: any;
  openModal: (name: ModalName, data?: any) => void;
  closeModal: () => void;
};

const ModalContext = createContext<ModalContextType | undefined>(undefined);

export function ModalProvider({ children }: { children: ReactNode }) {
  const [activeModal, setActiveModal] = useState<ModalName | null>(null);
  const [modalData, setModalData] = useState<any>(null);

  const openModal = (name: ModalName, data?: any) => {
    setActiveModal(name);
    setModalData(data);
  };

  const closeModal = () => {
    setActiveModal(null);
    setModalData(null);
  };

  return (
    <ModalContext.Provider value={{ activeModal, modalData, openModal, closeModal }}>
      {children}
    </ModalContext.Provider>
  );
}

export function useModal() {
  const context = useContext(ModalContext);
  if (context === undefined) {
    throw new Error('useModal must be used within a ModalProvider');
  }
  return context;
}
