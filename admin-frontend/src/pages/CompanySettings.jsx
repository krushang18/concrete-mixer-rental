import { useState, useEffect } from 'react';
import { 
  Building2, 
  Mail, 
  Phone, 
  MapPin, 
  Upload, 
  X, 
  Save, 
  Loader2, 
  Camera,
  FileSignature,
  Eye,
  EyeOff,
  Shield,
  Lock,
  CheckCircle2, 
  AlertCircle
} from 'lucide-react';
import { useForm } from 'react-hook-form';
import { companyApi, companyValidation, companyUtils } from '../services/companyApi';
import { authApi } from '../services/authApi'; // Import the auth API
import toast from 'react-hot-toast';

// Password Strength Indicator Component
const PasswordStrengthIndicator = ({ password }) => {
  // Password requirements
  const requirements = [
    {
      label: 'At least 6 characters',
      test: (pwd) => pwd.length >= 6,
      id: 'length'
    },
    {
      label: 'One lowercase letter',
      test: (pwd) => /[a-z]/.test(pwd),
      id: 'lowercase'
    },
    {
      label: 'One uppercase letter',
      test: (pwd) => /[A-Z]/.test(pwd),
      id: 'uppercase'
    },
    {
      label: 'One number',
      test: (pwd) => /\d/.test(pwd),
      id: 'number'
    }
  ]

  // Calculate strength
  const metRequirements = requirements.filter(req => req.test(password || ''))
  const strength = metRequirements.length
  const hasPassword = password && password.length > 0

  // Strength colors and labels
  const getStrengthColor = () => {
    if (strength === 0) return 'text-gray-400'
    if (strength === 1) return 'text-red-500'
    if (strength === 2) return 'text-orange-500'
    if (strength === 3) return 'text-blue-500'
    return 'text-green-500'
  }

  const getStrengthLabel = () => {
    if (strength === 0) return 'No password'
    if (strength === 1) return 'Very weak'
    if (strength === 2) return 'Weak'
    if (strength === 3) return 'Good'
    return 'Strong'
  }

  const getStrengthBarColor = (level) => {
    if (level > strength) return 'bg-gray-200'
    if (level === 1) return 'bg-red-500'
    if (level === 2) return 'bg-orange-500'
    if (level === 3) return 'bg-blue-500'
    return 'bg-green-500'
  }

  // Don't show anything if no password
  if (!hasPassword) return null

  return (
    <div className="space-y-3">
      {/* Strength Indicator */}
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-gray-700">
          Password strength:
        </span>
        <span className={`text-sm font-medium ${getStrengthColor()}`}>
          {getStrengthLabel()}
        </span>
      </div>
      
      {/* Strength Bars */}
      <div className="flex space-x-1">
        {[1, 2, 3, 4].map((level) => (
          <div
            key={level}
            className={`h-2 flex-1 rounded-full transition-colors duration-200 ${getStrengthBarColor(level)}`}
          />
        ))}
      </div>
      
      {/* Requirements Checklist */}
      <div className="space-y-2">
        <p className="text-sm font-medium text-gray-700 mb-2">
          Password must contain:
        </p>
        <div className="space-y-1">
          {requirements.map((req) => {
            const isMet = req.test(password || '')
            return (
              <div key={req.id} className="flex items-center text-sm">
                <div className="flex-shrink-0 mr-2">
                  {isMet ? (
                    <CheckCircle2 className="w-4 h-4 text-green-500" />
                  ) : (
                    <div className="w-4 h-4 border border-gray-300 rounded-full flex items-center justify-center">
                      <div className="w-1.5 h-1.5 bg-gray-300 rounded-full" />
                    </div>
                  )}
                </div>
                <span className={`${
                  isMet 
                    ? 'text-green-700 font-medium' 
                    : 'text-gray-600'
                }`}>
                  {req.label}
                </span>
              </div>
            )
          })}
        </div>
      </div>

      {/* Overall Status */}
      {strength === 4 && (
        <div className="flex items-center text-sm text-green-700 bg-green-50 rounded-lg p-3">
          <CheckCircle2 className="w-4 h-4 mr-2 flex-shrink-0" />
          <span className="font-medium">
            Great! Your password meets all security requirements.
          </span>
        </div>
      )}

      {strength > 0 && strength < 4 && (
        <div className="flex items-center text-sm text-orange-700 bg-orange-50 rounded-lg p-3">
          <AlertCircle className="w-4 h-4 mr-2 flex-shrink-0" />
          <span>
            Please meet all requirements for a secure password.
          </span>
        </div>
      )}
    </div>
  )
};

const CompanySettings = () => {
  const [companyData, setCompanyData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [logoUploading, setLogoUploading] = useState(false);
  const [signatureUploading, setSignatureUploading] = useState(false);
  const [activeTab, setActiveTab] = useState('details');
  const [showGST, setShowGST] = useState(false);
  const [previewUrls, setPreviewUrls] = useState({
    logo: null,
    signature: null
  });

  // Password form states
  const [changingPassword, setChangingPassword] = useState(false);
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false
  });

  const { register, handleSubmit, formState: { errors }, reset } = useForm();
  
  // Separate form for password change
  const { 
    register: registerPassword, 
    handleSubmit: handlePasswordSubmit, 
    formState: { errors: passwordErrors }, 
    reset: resetPasswordForm,
    watch: watchPassword 
  } = useForm();

  // Watch new password for confirmation validation and strength indicator
  const newPassword = watchPassword('newPassword');

  // Helper to get full image URL
  const getFullImageUrl = (path) => {
    if (!path) return null;
    if (path.startsWith('http') || path.startsWith('data:')) return path;
    
    // Determine backend origin
    let origin = "http://localhost:3000";
    const envApiUrl = process.env.REACT_APP_API_BASE_URL;
    
    if (envApiUrl && envApiUrl.startsWith('http')) {
        try {
            const urlObj = new URL(envApiUrl);
            origin = urlObj.origin;
        } catch (e) {
            console.error("Invalid REACT_APP_API_BASE_URL", e);
        }
    }
    
    // Ensure path starts with /
    const cleanPath = path.startsWith('/') ? path : '/' + path;
    return `${origin}${cleanPath}`;
  };

  // Debug helper - check image availability
  useEffect(() => {
    const checkImages = async () => {
      if (companyData) {
        try {
          // Use the image info endpoint instead of direct image routes
          const [logoInfo, signatureInfo] = await Promise.all([
            companyApi.getImageInfo('logo').catch(() => ({ success: false })),
            companyApi.getImageInfo('signature').catch(() => ({ success: false }))
          ]);
          
          console.log('Logo info:', logoInfo);
          console.log('Signature info:', signatureInfo);
          
          // Set preview URLs based on image info response
          const newPreviewUrls = {
            logo: logoInfo.success && logoInfo.data?.exists 
                ? getFullImageUrl(`${logoInfo.data.url}?t=${Date.now()}`) 
                : null,
            signature: signatureInfo.success && signatureInfo.data?.exists 
                ? getFullImageUrl(signatureInfo.data.url) || getFullImageUrl(`/api/admin/company/signature?t=${Date.now()}`) 
                : null
          };
          
          console.log('Setting preview URLs from info:', newPreviewUrls);
          setPreviewUrls(newPreviewUrls);
        } catch (error) {
          console.error('Error checking image info:', error);
          
          // Fallback: try direct image URLs anyway
          const fallbackUrls = {
            logo: getFullImageUrl(`/api/admin/company/logo?t=${Date.now()}`),
            signature: getFullImageUrl(`/api/admin/company/signature?t=${Date.now()}`)
          };
          
          console.log('Using fallback URLs:', fallbackUrls);
          setPreviewUrls(fallbackUrls);
        }
      }
    };
    
    checkImages();
  }, [companyData]);

  // Fetch company details on component mount
  useEffect(() => {
    fetchCompanyDetails();
  }, []);

  const fetchCompanyDetails = async () => {
    try {
      setLoading(true);
      // Use getDetailsWithImages to get company data including image info
      const response = await companyApi.getDetailsWithImages();
      if (response.success && response.data) {
        const formatted = companyUtils.formatCompanyInfo(response.data);
        setCompanyData(formatted);
        reset(formatted);
        
        // Set preview URLs using the backend endpoints directly
        setPreviewUrls({
          logo: response.data.logo_info?.exists ? getFullImageUrl(`/api/admin/company/logo?t=${Date.now()}`) : null,
          signature: response.data.signature_info?.exists ? getFullImageUrl(`/api/admin/company/signature?t=${Date.now()}`) : null
        });
      }
    } catch (error) {
      toast.error('Failed to load company details');
      console.error('Error fetching company details:', error);
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = async (data) => {
    // Validate data before submitting
    const validation = companyValidation.validateCompanyData(data);
    if (!validation.isValid) {
      validation.errors.forEach(error => toast.error(error));
      return;
    }

    try {
      setSaving(true);
      const response = await companyApi.updateDetails(data);
      if (response.success) {
        const formatted = companyUtils.formatCompanyInfo(response.data);
        setCompanyData(formatted);
        // Toast handled by API
        // Don't refetch, use the response data to minimize API calls
      }
    } catch (error) {
      console.error('Error updating company details:', error);
      // Toast handled by API
    } finally {
      setSaving(false);
    }
  };

  // Handle password change
  const onPasswordSubmit = async (data) => {
    try {
      setChangingPassword(true);
      
      const response = await authApi.changePassword({
        currentPassword: data.currentPassword,
        newPassword: data.newPassword,
        confirmNewPassword: data.confirmPassword // Match backend validation field name
      });

      if (response.success) {
        toast.success('Password changed successfully');
        resetPasswordForm();
      } else {
        toast.error(response.message || 'Failed to change password');
      }
    } catch (error) {
      console.error('Error changing password:', error);
      const errorMessage = error.response?.data?.message || 
                          error.response?.data?.errors?.[0]?.message ||
                          'Failed to change password';
      toast.error(errorMessage);
    } finally {
      setChangingPassword(false);
    }
  };

  const handleImageUpload = async (file, type) => {
    if (!file) return;

    const validation = type === 'logo' 
      ? companyValidation.validateLogoFile(file)
      : companyValidation.validateSignatureFile(file);

    if (!validation.isValid) {
      validation.errors.forEach(error => toast.error(error));
      return;
    }

    try {
      if (type === 'logo') setLogoUploading(true);
      else setSignatureUploading(true);

      // Show preview immediately
      const reader = new FileReader();
      reader.onload = (e) => {
        setPreviewUrls(prev => ({
          ...prev,
          [type]: e.target.result
        }));
      };
      reader.readAsDataURL(file);

      let response;
      if (type === 'logo') {
        response = await companyApi.uploadLogo(file);
      } else {
        response = await companyApi.uploadSignature(file);
      }

      if (response.success) {
        // Update local state to minimize API calls
        setCompanyData(prev => ({
          ...prev,
          [`${type}_url`]: response.data?.url || response.data?.[`${type}_url`] || true
        }));
        
        // Toast handled by API
        
        // Force a complete refresh of the preview after a short delay
        // This ensures the backend has processed the new image
        setTimeout(() => {
          const timestamp = Date.now();
          console.log(`Refreshing ${type} preview with timestamp:`, timestamp);
          
          setPreviewUrls(prev => ({
            ...prev,
            [type]: getFullImageUrl(`/api/admin/company/${type}?t=${timestamp}&refresh=true`)
          }));
        }, 500); // 500ms delay to ensure backend processing is complete
      }
    } catch (error) {
      // Reset preview on error - check if image exists on server
      const existingImageUrl = getFullImageUrl(`/api/admin/company/${type}?t=${Date.now()}`);
      setPreviewUrls(prev => ({
        ...prev,
        [type]: existingImageUrl
      }));
      console.error(`Error uploading ${type}:`, error);
      // Toast handled by API
    } finally {
      if (type === 'logo') setLogoUploading(false);
      else setSignatureUploading(false);
    }
  };

  const togglePasswordVisibility = (field) => {
    setShowPasswords(prev => ({
      ...prev,
      [field]: !prev[field]
    }));
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-blue-600" />
          <p className="text-gray-600">Loading company settings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-semibold text-gray-900 flex items-center">
                <Building2 className="w-5 h-5 mr-2 text-blue-600" />
                Company Settings
              </h1>
              <p className="text-sm text-gray-600 mt-1">
                Manage your company information and branding
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Tab Navigation - Mobile First */}
      <div className="bg-white border-b">
        <div className="px-4">
          <div className="flex space-x-1 overflow-x-auto">
            {[
              { id: 'details', label: 'Details', icon: Building2 },
              { id: 'branding', label: 'Branding', icon: Camera },
              { id: 'security', label: 'Security', icon: Shield },
            ].map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center px-3 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                    activeTab === tab.id
                      ? 'text-blue-600 border-blue-600'
                      : 'text-gray-500 border-transparent hover:text-gray-700'
                  }`}
                >
                  <Icon className="w-4 h-4 mr-1.5" />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="px-4 py-6">
        {activeTab === 'details' && (
          <div className="space-y-6">
            {/* Company Details Card */}
            <div className="bg-white rounded-lg shadow-sm border">
              <div className="px-4 py-4 border-b">
                <h2 className="text-lg font-semibold text-gray-900">Company Information</h2>
                <p className="text-sm text-gray-600">Update your company's basic information</p>
              </div>
              
              <div className="p-4 space-y-4">
                {/* Company Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Company Name *
                  </label>
                  <div className="relative">
                    <Building2 className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <input
                      type="text"
                      {...register('company_name', { required: 'Company name is required' })}
                      className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Enter company name"
                    />
                  </div>
                  {errors.company_name && (
                    <p className="mt-1 text-sm text-red-600">{errors.company_name.message}</p>
                  )}
                </div>

                {/* Email */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Email Address *
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <input
                      type="email"
                      {...register('email', { 
                        required: 'Email is required',
                        pattern: {
                          value: /^\S+@\S+\.\S+$/,
                          message: 'Invalid email format'
                        }
                      })}
                      className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Enter email address"
                    />
                  </div>
                  {errors.email && (
                    <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>
                  )}
                </div>

                {/* Phone Numbers */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      Primary Phone *
                    </label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                      <input
                        type="tel"
                        {...register('phone', { required: 'Primary phone is required' })}
                        className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="+91-9999999999"
                      />
                    </div>
                    {errors.phone && (
                      <p className="mt-1 text-sm text-red-600">{errors.phone.message}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      Secondary Phone
                    </label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                      <input
                        type="tel"
                        {...register('phone2')}
                        className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="+91-9999999999"
                      />
                    </div>
                  </div>
                </div>

                {/* GST Number */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    GST Number
                  </label>
                  <div className="relative">
                    <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 text-sm font-mono">
                      GST
                    </div>
                    <input
                      type={showGST ? 'text' : 'password'}
                      {...register('gst_number')}
                      className="w-full pl-12 pr-12 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono"
                      placeholder="22AAAAA0000A1Z5"
                    />
                    <button
                      type="button"
                      onClick={() => setShowGST(!showGST)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showGST ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {companyData?.formattedGST && (
                    <p className="mt-1 text-sm text-gray-500">
                      Formatted: {companyData.formattedGST}
                    </p>
                  )}
                </div>

                {/* Address */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Address *
                  </label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-3 text-gray-400 w-4 h-4" />
                    <textarea
                      {...register('address', { required: 'Address is required' })}
                      rows={3}
                      className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                      placeholder="Enter complete address"
                    />
                  </div>
                  {errors.address && (
                    <p className="mt-1 text-sm text-red-600">{errors.address.message}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Save Button */}
            <div className="flex justify-end">
              <button
                onClick={handleSubmit(onSubmit)}
                disabled={saving}
                className="flex items-center px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : (
                  <Save className="w-4 h-4 mr-2" />
                )}
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        )}

        {activeTab === 'branding' && (
          <div className="space-y-6">
            {/* Logo Upload */}
            <div className="bg-white rounded-lg shadow-sm border">
              <div className="px-4 py-4 border-b">
                <h2 className="text-lg font-semibold text-gray-900 flex items-center">
                  <Camera className="w-5 h-5 mr-2 text-blue-600" />
                  Company Logo
                </h2>
                <p className="text-sm text-gray-600">Upload your company logo (JPEG, PNG, GIF - Max 5MB)</p>
              </div>
              
              <div className="p-4">
                <div className="flex flex-col space-y-4">
                  {/* Logo Preview */}
                  <div className="flex items-center justify-center w-full">
                    <div className="w-48 h-32 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center bg-gray-50">
                      {previewUrls.logo ? (
                        <img
                          src={previewUrls.logo}
                          alt="Company Logo"
                          className="max-w-full max-h-full object-contain rounded"
                          onError={(e) => {
                            console.error('Logo failed to load:', previewUrls.logo);
                            e.target.style.display = 'none';
                          }}
                          onLoad={() => {
                            console.log('Logo loaded successfully:', previewUrls.logo);
                          }}
                        />
                      ) : (
                        <div className="text-center">
                          <Camera className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                          <p className="text-sm text-gray-500">No logo uploaded</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Upload Controls */}
                  <div className="flex flex-col sm:flex-row gap-3">
                    <label className="flex-1">
                      <input
                        type="file"
                        accept="image/jpeg,image/jpg,image/png,image/gif"
                        onChange={(e) => handleImageUpload(e.target.files[0], 'logo')}
                        className="sr-only"
                        disabled={logoUploading}
                      />
                      <div className="flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 cursor-pointer">
                        {logoUploading ? (
                          <Loader2 className="w-4 h-4 animate-spin mr-2" />
                        ) : (
                          <Upload className="w-4 h-4 mr-2" />
                        )}
                        {logoUploading ? 'Uploading...' : 'Upload Logo'}
                      </div>
                    </label>
                  </div>
                </div>
              </div>
            </div>

            {/* Signature Upload */}
            <div className="bg-white rounded-lg shadow-sm border">
              <div className="px-4 py-4 border-b">
                <h2 className="text-lg font-semibold text-gray-900 flex items-center">
                  <FileSignature className="w-5 h-5 mr-2 text-blue-600" />
                  Digital Signature
                </h2>
                <p className="text-sm text-gray-600">Upload your digital signature (JPEG, PNG - Max 2MB)</p>
              </div>
              
              <div className="p-4">
                <div className="flex flex-col space-y-4">
                  {/* Signature Preview */}
                  <div className="flex items-center justify-center w-full">
                    <div className="w-48 h-24 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center bg-gray-50">
                      {previewUrls.signature ? (
                        <img
                          src={previewUrls.signature}
                          alt="Digital Signature"
                          className="max-w-full max-h-full object-contain rounded"
                          onError={(e) => {
                            console.error('Signature failed to load:', previewUrls.signature);
                            e.target.style.display = 'none';
                          }}
                          onLoad={() => {
                            console.log('Signature loaded successfully:', previewUrls.signature);
                          }}
                        />
                      ) : (
                        <div className="text-center">
                          <FileSignature className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                          <p className="text-sm text-gray-500">No signature uploaded</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Upload Controls */}
                  <div className="flex flex-col sm:flex-row gap-3">
                    <label className="flex-1">
                      <input
                        type="file"
                        accept="image/jpeg,image/jpg,image/png"
                        onChange={(e) => handleImageUpload(e.target.files[0], 'signature')}
                        className="sr-only"
                        disabled={signatureUploading}
                      />
                      <div className="flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 cursor-pointer">
                        {signatureUploading ? (
                          <Loader2 className="w-4 h-4 animate-spin mr-2" />
                        ) : (
                          <Upload className="w-4 h-4 mr-2" />
                        )}
                        {signatureUploading ? 'Uploading...' : 'Upload Signature'}
                      </div>
                    </label>
                  </div>
                </div>
              </div>
            </div>

            {/* Company Preview */}
            {companyData && (
              <div className="bg-white rounded-lg shadow-sm border">
                <div className="px-4 py-4 border-b">
                  <h2 className="text-lg font-semibold text-gray-900">Preview</h2>
                  <p className="text-sm text-gray-600">How your company information will appear</p>
                </div>
                
                <div className="p-4">
                  <div className="border rounded-lg p-4 bg-gray-50">
                    <div className="text-center mb-4">
                      {previewUrls.logo && (
                        <img
                          src={previewUrls.logo}
                          alt={companyData.company_name}
                          className="max-h-16 mx-auto mb-3"
                        />
                      )}
                      <h3 className="text-xl font-bold text-blue-600 mb-2">
                        {companyData.company_name}
                      </h3>
                      <div className="text-sm text-gray-600 space-y-1">
                        {companyData.address && (
                          <p>{companyData.displayAddress}</p>
                        )}
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-center sm:space-x-4 space-y-1 sm:space-y-0">
                          {companyData.formattedPhone && (
                            <p>Phone: {companyData.formattedPhone}</p>
                          )}
                          {companyData.email && (
                            <p>Email: {companyData.email}</p>
                          )}
                        </div>
                        {companyData.formattedGST && (
                          <p>GST: {companyData.formattedGST}</p>
                        )}
                      </div>
                    </div>
                    {previewUrls.signature && (
                      <div className="border-t pt-4 text-center">
                        <img
                          src={previewUrls.signature}
                          alt="Signature"
                          className="max-h-12 mx-auto"
                        />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'security' && (
          <div className="space-y-6">
            {/* Password Change Card */}
            <div className="bg-white rounded-lg shadow-sm border">
              <div className="px-4 py-4 border-b">
                <h2 className="text-lg font-semibold text-gray-900 flex items-center">
                  <Lock className="w-5 h-5 mr-2 text-blue-600" />
                  Change Password
                </h2>
                <p className="text-sm text-gray-600">Update your account password for better security</p>
              </div>
              
              <div className="p-4 space-y-4">
                <form onSubmit={handlePasswordSubmit(onPasswordSubmit)} className="space-y-4">
                  {/* Current Password */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      Current Password *
                    </label>
                    <div className="relative group">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Lock className="h-5 w-5 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
                      </div>
                      <input
                        type={showPasswords.current ? 'text' : 'password'}
                        {...registerPassword('currentPassword', { 
                          required: 'Current password is required',
                          minLength: {
                            value: 6,
                            message: 'Password must be at least 6 characters'
                          }
                        })}
                        className="block w-full pl-10 pr-12 py-3 border border-gray-300 rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm transition-all duration-200"
                        placeholder="Current password"
                      />
                      <button
                        type="button"
                        onClick={() => togglePasswordVisibility('current')}
                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 focus:outline-none transition-colors"
                      >
                        {showPasswords.current ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                      </button>
                    </div>
                    {passwordErrors.currentPassword && (
                      <p className="mt-1 text-sm text-red-600">{passwordErrors.currentPassword.message}</p>
                    )}
                  </div>

                  {/* New Password */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      New Password *
                    </label>
                    <div className="relative group">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Lock className="h-5 w-5 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
                      </div>
                      <input
                        type={showPasswords.new ? 'text' : 'password'}
                        {...registerPassword('newPassword', { 
                          required: 'New password is required',
                          minLength: {
                            value: 6,
                            message: 'Password must be at least 6 characters'
                          }
                        })}
                        className="block w-full pl-10 pr-12 py-3 border border-gray-300 rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm transition-all duration-200"
                        placeholder="New password"
                      />
                      <button
                        type="button"
                        onClick={() => togglePasswordVisibility('new')}
                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 focus:outline-none transition-colors"
                      >
                        {showPasswords.new ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                      </button>
                    </div>
                    {passwordErrors.newPassword && (
                      <p className="mt-1 text-sm text-red-600">{passwordErrors.newPassword.message}</p>
                    )}
                    
                    {/* Password Strength Indicator */}
                    <div className="mt-3">
                      <PasswordStrengthIndicator password={newPassword} />
                    </div>
                  </div>

                  {/* Confirm New Password */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      Confirm New Password *
                    </label>
                    <div className="relative group">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Lock className="h-5 w-5 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
                      </div>
                      <input
                        type={showPasswords.confirm ? 'text' : 'password'}
                        {...registerPassword('confirmPassword', { 
                          required: 'Please confirm your new password',
                          validate: value => value === newPassword || 'Passwords do not match'
                        })}
                        className="block w-full pl-10 pr-12 py-3 border border-gray-300 rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm transition-all duration-200"
                        placeholder="Confirm password"
                      />
                      <button
                        type="button"
                        onClick={() => togglePasswordVisibility('confirm')}
                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 focus:outline-none transition-colors"
                      >
                        {showPasswords.confirm ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                      </button>
                    </div>
                    {passwordErrors.confirmPassword && (
                      <p className="mt-1 text-sm text-red-600">{passwordErrors.confirmPassword.message}</p>
                    )}
                  </div>

                  {/* Password Change Button */}
                  <div className="flex justify-end pt-4">
                    <button
                      type="submit"
                      disabled={changingPassword}
                      className="flex items-center px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {changingPassword ? (
                        <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      ) : (
                        <Shield className="w-4 h-4 mr-2" />
                      )}
                      {changingPassword ? 'Changing Password...' : 'Change Password'}
                    </button>
                  </div>
                </form>
              </div>
            </div>

            {/* Security Tips */}
            <div className="bg-blue-50 rounded-lg border border-blue-200">
              <div className="p-4">
                <h3 className="text-sm font-semibold text-blue-800 mb-3 flex items-center">
                  <Shield className="w-4 h-4 mr-2" />
                  Password Security Tips
                </h3>
                <ul className="text-xs text-blue-700 space-y-1">
                  <li>• Use at least 8 characters with a mix of uppercase, lowercase, and numbers</li>
                  <li>• Avoid using personal information like names, birthdays, or common words</li>
                  <li>• Consider using a unique password that you don't use elsewhere</li>
                  <li>• Change your password regularly for better security</li>
                </ul>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CompanySettings;