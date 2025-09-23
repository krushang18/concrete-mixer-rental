import React from 'react';
import { useNavigate } from 'react-router-dom';
import ServiceForm from '../../components/services/ServiceForm';

const AddServicePage = () => {
  const navigate = useNavigate();
  
  return (
    <ServiceForm 
      onBack={() => navigate('/services')}
    />
  );
};

export default AddServicePage;