import { useContext } from 'react';
import { ConfirmContext } from '../context/confirm-context';

export const useConfirm = () => useContext(ConfirmContext);
