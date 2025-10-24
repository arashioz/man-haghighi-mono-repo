const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');

async function testUpload() {
  try {
    console.log('Testing video upload functionality...');
    
    // Login to get JWT token
    console.log('Getting JWT token...');
    const loginResponse = await axios.post('http://localhost:3000/auth/login', {
      email: 'admin@haghighi.com',
      password: 'admin123'
    });
    
    const token = loginResponse.data.access_token;
    console.log('Got token:', token.substring(0, 20) + '...');
    
    // Test video upload
    console.log('Testing video upload...');
    const formData = new FormData();
    formData.append('file', fs.createReadStream('/app/frontend/public/assets/celebrities-videos/farkhonde-farmanizade.mp4'));
    
    const uploadResponse = await axios.post('http://localhost:3000/uploads/video', formData, {
      headers: {
        'Authorization': `Bearer ${token}`,
        ...formData.getHeaders()
      }
    });
    
    console.log('Upload successful:', uploadResponse.data);
    
    // Test invalid file type
    console.log('Testing invalid file type rejection...');
    const invalidFormData = new FormData();
    invalidFormData.append('file', fs.createReadStream('/app/README.md'));
    
    try {
      await axios.post('http://localhost:3000/uploads/video', invalidFormData, {
        headers: {
          'Authorization': `Bearer ${token}`,
          ...invalidFormData.getHeaders()
        }
      });
      console.log('❌ File type validation test FAILED!');
    } catch (error) {
      if (error.response?.data?.message?.includes('Only video files are allowed')) {
        console.log('✅ File type validation test PASSED!');
      } else {
        console.log('❌ File type validation test FAILED!');
        console.log('Error:', error.response?.data);
      }
    }
    
  } catch (error) {
    console.error('Test failed:', error.response?.data || error.message);
  }
}

testUpload();
