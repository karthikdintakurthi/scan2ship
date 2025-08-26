// Fallback pincode database for common Indian locations
// This can be used when Delhivery API is not available

interface PincodeData {
  city: string;
  state: string;
  country: string;
  serviceable: boolean;
}

const pincodeDatabase: Record<string, PincodeData> = {
  // Major cities (only unique ones)
  '110001': { city: 'New Delhi', state: 'Delhi', country: 'India', serviceable: true },
  '110002': { city: 'New Delhi', state: 'Delhi', country: 'India', serviceable: true },
  '110003': { city: 'New Delhi', state: 'Delhi', country: 'India', serviceable: true },
  
  // Andhra Pradesh
  '521001': { city: 'Machilipatnam', state: 'Andhra Pradesh', country: 'India', serviceable: true },
  '521002': { city: 'Machilipatnam', state: 'Andhra Pradesh', country: 'India', serviceable: true },
  '520001': { city: 'Vijayawada', state: 'Andhra Pradesh', country: 'India', serviceable: true },
  '520002': { city: 'Vijayawada', state: 'Andhra Pradesh', country: 'India', serviceable: true },
  '530001': { city: 'Visakhapatnam', state: 'Andhra Pradesh', country: 'India', serviceable: true },
  '530002': { city: 'Visakhapatnam', state: 'Andhra Pradesh', country: 'India', serviceable: true },
  
  // Telangana
  '500001': { city: 'Hyderabad', state: 'Telangana', country: 'India', serviceable: true },
  '500002': { city: 'Hyderabad', state: 'Telangana', country: 'India', serviceable: true },
  '500003': { city: 'Hyderabad', state: 'Telangana', country: 'India', serviceable: true },
  
  // Karnataka
  '560001': { city: 'Bangalore', state: 'Karnataka', country: 'India', serviceable: true },
  '560002': { city: 'Bangalore', state: 'Karnataka', country: 'India', serviceable: true },
  '560003': { city: 'Bangalore', state: 'Karnataka', country: 'India', serviceable: true },
  
  // Tamil Nadu
  '600001': { city: 'Chennai', state: 'Tamil Nadu', country: 'India', serviceable: true },
  '600002': { city: 'Chennai', state: 'Tamil Nadu', country: 'India', serviceable: true },
  '600003': { city: 'Chennai', state: 'Tamil Nadu', country: 'India', serviceable: true },
  
  // Kerala
  '682001': { city: 'Kochi', state: 'Kerala', country: 'India', serviceable: true },
  '682002': { city: 'Kochi', state: 'Kerala', country: 'India', serviceable: true },
  '695001': { city: 'Thiruvananthapuram', state: 'Kerala', country: 'India', serviceable: true },
  '695002': { city: 'Thiruvananthapuram', state: 'Kerala', country: 'India', serviceable: true },
  
  // Maharashtra
  '400001': { city: 'Mumbai', state: 'Maharashtra', country: 'India', serviceable: true },
  '400002': { city: 'Mumbai', state: 'Maharashtra', country: 'India', serviceable: true },
  '400003': { city: 'Mumbai', state: 'Maharashtra', country: 'India', serviceable: true },
  '411001': { city: 'Pune', state: 'Maharashtra', country: 'India', serviceable: true },
  '411002': { city: 'Pune', state: 'Maharashtra', country: 'India', serviceable: true },
  
  // Gujarat
  '380001': { city: 'Ahmedabad', state: 'Gujarat', country: 'India', serviceable: true },
  '380002': { city: 'Ahmedabad', state: 'Gujarat', country: 'India', serviceable: true },
  '380003': { city: 'Ahmedabad', state: 'Gujarat', country: 'India', serviceable: true },
  
  // Rajasthan
  '302001': { city: 'Jaipur', state: 'Rajasthan', country: 'India', serviceable: true },
  '302002': { city: 'Jaipur', state: 'Rajasthan', country: 'India', serviceable: true },
  '302003': { city: 'Jaipur', state: 'Rajasthan', country: 'India', serviceable: true },
  
  // Uttar Pradesh
  '226001': { city: 'Lucknow', state: 'Uttar Pradesh', country: 'India', serviceable: true },
  '226002': { city: 'Lucknow', state: 'Uttar Pradesh', country: 'India', serviceable: true },
  '226003': { city: 'Lucknow', state: 'Uttar Pradesh', country: 'India', serviceable: true },
  
  // Bihar
  '800001': { city: 'Patna', state: 'Bihar', country: 'India', serviceable: true },
  '800002': { city: 'Patna', state: 'Bihar', country: 'India', serviceable: true },
  '800003': { city: 'Patna', state: 'Bihar', country: 'India', serviceable: true },
  
  // West Bengal
  '700001': { city: 'Kolkata', state: 'West Bengal', country: 'India', serviceable: true },
  '700002': { city: 'Kolkata', state: 'West Bengal', country: 'India', serviceable: true },
  '700003': { city: 'Kolkata', state: 'West Bengal', country: 'India', serviceable: true },
  
  // Odisha
  '751001': { city: 'Bhubaneswar', state: 'Odisha', country: 'India', serviceable: true },
  '751002': { city: 'Bhubaneswar', state: 'Odisha', country: 'India', serviceable: true },
  '751003': { city: 'Bhubaneswar', state: 'Odisha', country: 'India', serviceable: true },
  
  // Madhya Pradesh
  '452001': { city: 'Indore', state: 'Madhya Pradesh', country: 'India', serviceable: true },
  '452002': { city: 'Indore', state: 'Madhya Pradesh', country: 'India', serviceable: true },
  '452003': { city: 'Indore', state: 'Madhya Pradesh', country: 'India', serviceable: true },
  
  // Punjab
  '141001': { city: 'Ludhiana', state: 'Punjab', country: 'India', serviceable: true },
  '141002': { city: 'Ludhiana', state: 'Punjab', country: 'India', serviceable: true },
  '141003': { city: 'Ludhiana', state: 'Punjab', country: 'India', serviceable: true },
  
  // Haryana
  '122001': { city: 'Gurgaon', state: 'Haryana', country: 'India', serviceable: true },
  '122002': { city: 'Gurgaon', state: 'Haryana', country: 'India', serviceable: true },
  '122003': { city: 'Gurgaon', state: 'Haryana', country: 'India', serviceable: true },
  
  // Uttarakhand
  '248001': { city: 'Dehradun', state: 'Uttarakhand', country: 'India', serviceable: true },
  '248002': { city: 'Dehradun', state: 'Uttarakhand', country: 'India', serviceable: true },
  '248003': { city: 'Dehradun', state: 'Uttarakhand', country: 'India', serviceable: true },
  
  // Himachal Pradesh
  '171001': { city: 'Shimla', state: 'Himachal Pradesh', country: 'India', serviceable: true },
  '171002': { city: 'Shimla', state: 'Himachal Pradesh', country: 'India', serviceable: true },
  '171003': { city: 'Shimla', state: 'Himachal Pradesh', country: 'India', serviceable: true },
  
  // Jammu & Kashmir
  '180001': { city: 'Jammu', state: 'Jammu & Kashmir', country: 'India', serviceable: true },
  '180002': { city: 'Jammu', state: 'Jammu & Kashmir', country: 'India', serviceable: true },
  '180003': { city: 'Jammu', state: 'Jammu & Kashmir', country: 'India', serviceable: true },
  
  // Assam
  '781001': { city: 'Guwahati', state: 'Assam', country: 'India', serviceable: true },
  '781002': { city: 'Guwahati', state: 'Assam', country: 'India', serviceable: true },
  '781003': { city: 'Guwahati', state: 'Assam', country: 'India', serviceable: true },
  
  // Manipur
  '795001': { city: 'Imphal', state: 'Manipur', country: 'India', serviceable: true },
  '795002': { city: 'Imphal', state: 'Manipur', country: 'India', serviceable: true },
  '795003': { city: 'Imphal', state: 'Manipur', country: 'India', serviceable: true },
  
  // Meghalaya
  '793001': { city: 'Shillong', state: 'Meghalaya', country: 'India', serviceable: true },
  '793002': { city: 'Shillong', state: 'Meghalaya', country: 'India', serviceable: true },
  '793003': { city: 'Shillong', state: 'Meghalaya', country: 'India', serviceable: true },
  
  // Nagaland
  '797001': { city: 'Kohima', state: 'Nagaland', country: 'India', serviceable: true },
  '797002': { city: 'Kohima', state: 'Nagaland', country: 'India', serviceable: true },
  '797003': { city: 'Kohima', state: 'Nagaland', country: 'India', serviceable: true },
  
  // Tripura
  '799001': { city: 'Agartala', state: 'Tripura', country: 'India', serviceable: true },
  '799002': { city: 'Agartala', state: 'Tripura', country: 'India', serviceable: true },
  '799003': { city: 'Agartala', state: 'Tripura', country: 'India', serviceable: true },
  
  // Mizoram
  '796001': { city: 'Aizawl', state: 'Mizoram', country: 'India', serviceable: true },
  '796002': { city: 'Aizawl', state: 'Mizoram', country: 'India', serviceable: true },
  '796003': { city: 'Aizawl', state: 'Mizoram', country: 'India', serviceable: true },
  
  // Arunachal Pradesh
  '791001': { city: 'Itanagar', state: 'Arunachal Pradesh', country: 'India', serviceable: true },
  '791002': { city: 'Itanagar', state: 'Arunachal Pradesh', country: 'India', serviceable: true },
  '791003': { city: 'Itanagar', state: 'Arunachal Pradesh', country: 'India', serviceable: true },
  
  // Sikkim
  '737101': { city: 'Gangtok', state: 'Sikkim', country: 'India', serviceable: true },
  '737102': { city: 'Gangtok', state: 'Sikkim', country: 'India', serviceable: true },
  '737103': { city: 'Gangtok', state: 'Sikkim', country: 'India', serviceable: true },
  
  // Goa
  '403001': { city: 'Panaji', state: 'Goa', country: 'India', serviceable: true },
  '403002': { city: 'Panaji', state: 'Goa', country: 'India', serviceable: true },
  '403003': { city: 'Panaji', state: 'Goa', country: 'India', serviceable: true },
  
  // Chhattisgarh
  '492001': { city: 'Raipur', state: 'Chhattisgarh', country: 'India', serviceable: true },
  '492002': { city: 'Raipur', state: 'Chhattisgarh', country: 'India', serviceable: true },
  '492003': { city: 'Raipur', state: 'Chhattisgarh', country: 'India', serviceable: true },
  
  // Jharkhand
  '834001': { city: 'Ranchi', state: 'Jharkhand', country: 'India', serviceable: true },
  '834002': { city: 'Ranchi', state: 'Jharkhand', country: 'India', serviceable: true },
  '834003': { city: 'Ranchi', state: 'Jharkhand', country: 'India', serviceable: true },
};

export function validatePincodeFallback(pincode: string): {
  success: boolean;
  serviceable: boolean;
  city?: string;
  state?: string;
  country?: string;
  message?: string;
} {
  const data = pincodeDatabase[pincode];
  
  if (data) {
    return {
      success: true,
      serviceable: data.serviceable,
      city: data.city,
      state: data.state,
      country: data.country,
      message: data.serviceable 
        ? 'Pincode is serviceable (using fallback database)' 
        : 'Pincode is not serviceable (using fallback database)',
    };
  }
  
  return {
    success: false,
    serviceable: false,
    message: 'Pincode not found in database',
  };
}
