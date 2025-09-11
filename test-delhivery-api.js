// Test Delhivery API for specific tracking ID
// Using built-in fetch (Node.js 18+)

async function testDelhiveryAPI() {
  try {
    const trackingId = '42746410004480';
    
    // Use a test API key (replace with real one)
    const apiKey = 'test-key';
    
    const url = `https://track.delhivery.com/api/v1/packages/json/?waybill=${trackingId}`;
    
    console.log('Testing Delhivery API for tracking ID:', trackingId);
    console.log('URL:', url);
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Token ${apiKey}`,
      }
    });
    
    console.log('Response status:', response.status);
    
    if (response.ok) {
      const data = await response.json();
      console.log('Response data:', JSON.stringify(data, null, 2));
      
      if (data.ShipmentData && data.ShipmentData.length > 0) {
        const shipment = data.ShipmentData[0].Shipment;
        console.log('\nShipment details:');
        console.log('AWB:', shipment.AWB);
        console.log('Status:', shipment.Status?.Status);
        console.log('Instructions:', shipment.Status?.Instructions);
        console.log('Delivery Date:', shipment.DeliveryDate);
        console.log('Pickup Date:', shipment.PickUpDate);
      }
    } else {
      const errorText = await response.text();
      console.log('Error response:', errorText);
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  }
}

testDelhiveryAPI();
