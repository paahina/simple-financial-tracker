import { useContext } from 'react';
import { PrivacyContext } from '../context/privacy-context';

export const usePrivacy = () => useContext(PrivacyContext);
