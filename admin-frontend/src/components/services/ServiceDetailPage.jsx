// Create a new file: ServiceDetailPage.jsx
import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import ServiceDetailView from './ServiceDetailView';

const ServiceDetailPage = () => {
  const { serviceId } = useParams(); // Extract serviceId from URL
  const navigate = useNavigate();

  return (
    <ServiceDetailView 
      serviceId={parseInt(serviceId)} // Convert string to number
      onBack={() => navigate('/services')}
      onEdit={(id) => navigate(`/services/${id}/edit`)}
      onDelete={(id) => {
        // Handle delete logic here
        console.log('Delete service:', id);
      }}
    />
  );
};

export default ServiceDetailPage;