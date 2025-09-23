import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import ServiceForm from '../../components/services/ServiceForm';

const EditServicePage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  
  return (
    <ServiceForm 
      serviceId={parseInt(id)}
      onBack={() => navigate('/services')}
    />
  );
};

export default EditServicePage;