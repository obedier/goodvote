#!/usr/bin/env node

const fetch = require('node-fetch');

async function debugAPIStructure() {
  const baseUrl = 'http://localhost:3000';
  
  console.log('🔍 Debugging API Response Structure...\n');
  
  // Test Congress API
  console.log('📋 Congress API:');
  try {
    const congressResponse = await fetch(`${baseUrl}/api/congress?limit=1`);
    const congressData = await congressResponse.json();
    console.log('  Status:', congressResponse.status);
    console.log('  Success:', congressData.success);
    console.log('  Data type:', typeof congressData.data);
    console.log('  Data is array:', Array.isArray(congressData.data));
    console.log('  Data length:', congressData.data ? congressData.data.length : 'null');
    console.log('  Data keys:', congressData.data ? Object.keys(congressData.data) : 'null');
  } catch (error) {
    console.log('  Error:', error.message);
  }
  
  // Test Contributions API
  console.log('\n📋 Contributions API:');
  try {
    const contributionsResponse = await fetch(`${baseUrl}/api/contributions?limit=1`);
    const contributionsData = await contributionsResponse.json();
    console.log('  Status:', contributionsResponse.status);
    console.log('  Success:', contributionsData.success);
    console.log('  Data type:', typeof contributionsData.data);
    console.log('  Data is array:', Array.isArray(contributionsData.data));
    console.log('  Data length:', contributionsData.data ? contributionsData.data.length : 'null');
    console.log('  Data keys:', contributionsData.data ? Object.keys(contributionsData.data) : 'null');
  } catch (error) {
    console.log('  Error:', error.message);
  }
  
  // Test Search API
  console.log('\n📋 Search API:');
  try {
    const searchResponse = await fetch(`${baseUrl}/api/search?q=trump&limit=1`);
    const searchData = await searchResponse.json();
    console.log('  Status:', searchResponse.status);
    console.log('  Success:', searchData.success);
    console.log('  Data type:', typeof searchData.data);
    console.log('  Data is array:', Array.isArray(searchData.data));
    console.log('  Data length:', searchData.data ? searchData.data.length : 'null');
    console.log('  Data keys:', searchData.data ? Object.keys(searchData.data) : 'null');
  } catch (error) {
    console.log('  Error:', error.message);
  }
}

debugAPIStructure(); 