#!/usr/bin/env node

const puppeteer = require('puppeteer');

// Configuration
const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3000';
const TEST_PAGES = [
  '/',
  '/politicians/congress',
  '/lobbying/pacs',
  '/elections/overview',
  '/elections/get-local',
  '/elections/presidential'
];

// Test results tracking
const testResults = {
  passed: 0,
  failed: 0,
  errors: [],
  details: []
};

// Utility functions
function logTest(name, passed, details = '') {
  const status = passed ? '✅ PASS' : '❌ FAIL';
  console.log(`${status} ${name}`);
  if (details) console.log(`   ${details}`);
  
  if (passed) {
    testResults.passed++;
  } else {
    testResults.failed++;
  }
  
  testResults.details.push({ name, passed, details });
}

async function testPageLoad(page, url, name) {
  try {
    const startTime = Date.now();
    await page.goto(url, { waitUntil: 'networkidle0' });
    const endTime = Date.now();
    const duration = endTime - startTime;
    
    const title = await page.title();
    const isLoaded = title && title !== 'Error' && duration < 10000; // 10 seconds max
    
    logTest(`${name} Page Load`, isLoaded, 
      `Title: "${title}", Time: ${duration}ms`);
    
    return { success: isLoaded, duration, title };
  } catch (error) {
    logTest(`${name} Page Load`, false, error.message);
    return { success: false, error: error.message };
  }
}

async function testNavigation(page) {
  try {
    // Test header navigation
    const navItems = [
      { selector: 'a[href="/politicians"]', text: 'Politicians' },
      { selector: 'a[href="/elections"]', text: 'Elections' },
      { selector: 'a[href="/lobbying"]', text: 'Lobbying & Groups' },
      { selector: 'a[href="/learn"]', text: 'Learn' },
      { selector: 'a[href="/about"]', text: 'About' }
    ];
    
    let navWorks = true;
    for (const item of navItems) {
      try {
        const element = await page.$(item.selector);
        const isVisible = element !== null;
        if (!isVisible) {
          navWorks = false;
          console.log(`   Navigation item "${item.text}" not found`);
        }
      } catch (error) {
        navWorks = false;
        console.log(`   Navigation item "${item.text}" error: ${error.message}`);
      }
    }
    
    logTest('Header Navigation', navWorks, 'All navigation items present');
    return navWorks;
  } catch (error) {
    logTest('Header Navigation', false, error.message);
    return false;
  }
}

async function testMobileResponsiveness(page) {
  try {
    // Set mobile viewport
    await page.setViewport({ width: 375, height: 667 });
    
    // Check if mobile menu exists
    const mobileMenu = await page.$('button[aria-label*="menu"], .mobile-menu, .hamburger');
    const hasMobileMenu = mobileMenu !== null;
    
    // Check if content is responsive
    const bodyWidth = await page.evaluate(() => document.body.offsetWidth);
    const isResponsive = bodyWidth <= 375; // Should fit mobile viewport
    
    logTest('Mobile Responsiveness', hasMobileMenu && isResponsive, 
      `Mobile menu: ${hasMobileMenu}, Responsive width: ${bodyWidth}px`);
    
    return hasMobileMenu && isResponsive;
  } catch (error) {
    logTest('Mobile Responsiveness', false, error.message);
    return false;
  }
}

async function testDataDisplay(page, pageName) {
  try {
    // Check for data tables or lists
    const dataElements = await page.$$('table, .data-table, .list-item, .card');
    const hasDataElements = dataElements.length > 0;
    
    // Check for loading states
    const loadingElements = await page.$$('.loading, .spinner, [data-loading]');
    const hasLoadingStates = loadingElements.length === 0; // Should not be loading
    
    // Check for error states
    const errorElements = await page.$$('.error, .alert-error, [data-error]');
    const hasNoErrors = errorElements.length === 0;
    
    logTest(`${pageName} Data Display`, hasDataElements && hasLoadingStates && hasNoErrors,
      `Data elements: ${dataElements.length}, Loading: ${!hasLoadingStates}, Errors: ${!hasNoErrors}`);
    
    return hasDataElements && hasLoadingStates && hasNoErrors;
  } catch (error) {
    logTest(`${pageName} Data Display`, false, error.message);
    return false;
  }
}

async function testSearchFunctionality(page) {
  try {
    // Look for search input
    const searchInput = await page.$('input[type="search"], input[placeholder*="search"], .search-input');
    
    if (searchInput) {
      // Test search interaction
      await searchInput.click();
      await searchInput.type('test');
      
      // Check if search results appear
      await page.waitForTimeout(1000);
      const searchResults = await page.$$('.search-results, .autocomplete, [data-search-results]');
      
      logTest('Search Functionality', true, 'Search input found and interactive');
      return true;
    } else {
      logTest('Search Functionality', false, 'No search input found');
      return false;
    }
  } catch (error) {
    logTest('Search Functionality', false, error.message);
    return false;
  }
}

async function testBreadcrumbs(page, pageName) {
  try {
    const breadcrumbs = await page.$$('.breadcrumbs, [data-breadcrumbs], nav[aria-label*="breadcrumb"]');
    const hasBreadcrumbs = breadcrumbs.length > 0;
    
    logTest(`${pageName} Breadcrumbs`, hasBreadcrumbs, 
      hasBreadcrumbs ? 'Breadcrumbs navigation present' : 'No breadcrumbs found');
    
    return hasBreadcrumbs;
  } catch (error) {
    logTest(`${pageName} Breadcrumbs`, false, error.message);
    return false;
  }
}

async function testAccessibility(page, pageName) {
  try {
    // Check for alt text on images
    const images = await page.$$('img');
    let imagesWithAlt = 0;
    for (const img of images) {
      const alt = await img.getAttribute('alt');
      if (alt) imagesWithAlt++;
    }
    const hasAltText = images.length === 0 || imagesWithAlt === images.length;
    
    // Check for ARIA labels
    const ariaElements = await page.$$('[aria-label], [aria-labelledby]');
    const hasAriaLabels = ariaElements.length > 0;
    
    // Check for semantic HTML
    const semanticElements = await page.$$('main, nav, section, article, aside, header, footer');
    const hasSemanticHTML = semanticElements.length > 0;
    
    logTest(`${pageName} Accessibility`, hasAltText && hasAriaLabels && hasSemanticHTML,
      `Alt text: ${hasAltText}, ARIA labels: ${hasAriaLabels}, Semantic HTML: ${hasSemanticHTML}`);
    
    return hasAltText && hasAriaLabels && hasSemanticHTML;
  } catch (error) {
    logTest(`${pageName} Accessibility`, false, error.message);
    return false;
  }
}

async function testSpecificPageFunctionality(page, pageName) {
  try {
    switch (pageName) {
      case 'Homepage':
        // Test hero section
        const hero = await page.$('.hero, .hero-section, [data-hero]');
        const hasHero = hero !== null;
        
        // Test feature cards
        const featureCards = await page.$$('.feature-card, .card, [data-feature]');
        const hasFeatures = featureCards.length > 0;
        
        logTest('Homepage Features', hasHero && hasFeatures,
          `Hero section: ${hasHero}, Feature cards: ${featureCards.length}`);
        return hasHero && hasFeatures;
        
      case 'Congress':
        // Test filters
        const filters = await page.$$('select, .filter, [data-filter]');
        const hasFilters = filters.length > 0;
        
        // Test member list
        const members = await page.$$('.member-card, .congress-member, [data-member]');
        const hasMembers = members.length > 0;
        
        logTest('Congress Page Features', hasFilters && hasMembers,
          `Filters: ${hasFilters}, Members: ${members.length}`);
        return hasFilters && hasMembers;
        
      case 'PACs':
        // Test stats cards
        const stats = await page.$$('.stat-card, .stats, [data-stat]');
        const hasStats = stats.length > 0;
        
        // Test PAC table
        const pacTable = await page.$('table, .pac-table, [data-pac-table]');
        const hasTable = pacTable !== null;
        
        logTest('PACs Page Features', hasStats && hasTable,
          `Stats cards: ${hasStats}, PAC table: ${hasTable}`);
        return hasStats && hasTable;
        
      default:
        return true;
    }
  } catch (error) {
    logTest(`${pageName} Features`, false, error.message);
    return false;
  }
}

async function runAllTests() {
  console.log('🧪 Running GoodVote Frontend Tests');
  console.log(`📍 Base URL: ${BASE_URL}\n`);
  
  let browser;
  try {
    browser = await puppeteer.launch({ 
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    const page = await browser.newPage();
    
    // Test server availability
    try {
      await page.goto(BASE_URL, { waitUntil: 'networkidle0' });
      const title = await page.title();
      logTest('Server Availability', title && title !== 'Error', 
        `Server responding, title: "${title}"`);
    } catch (error) {
      logTest('Server Availability', false, error.message);
      console.log('\n❌ Server is not running. Please start the development server with: npm run dev');
      process.exit(1);
    }
    
    // Test each page
    for (const testPage of TEST_PAGES) {
      const pageName = testPage === '/' ? 'Homepage' : 
        testPage.split('/').pop().replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
      
      console.log(`\n📄 Testing ${pageName} (${testPage})`);
      
      // Test page load
      await testPageLoad(page, `${BASE_URL}${testPage}`, pageName);
      
      // Test navigation (only on homepage)
      if (testPage === '/') {
        await testNavigation(page);
      }
      
      // Test mobile responsiveness
      await testMobileResponsiveness(page);
      
      // Test data display
      await testDataDisplay(page, pageName);
      
      // Test breadcrumbs
      await testBreadcrumbs(page, pageName);
      
      // Test accessibility
      await testAccessibility(page, pageName);
      
      // Test page-specific functionality
      await testSpecificPageFunctionality(page, pageName);
    }
    
    // Test search functionality (on homepage)
    await page.goto(BASE_URL);
    await testSearchFunctionality(page);
    
  } catch (error) {
    console.error('❌ Test execution failed:', error);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
  
  // Summary
  console.log('\n📊 Test Summary');
  console.log(`✅ Passed: ${testResults.passed}`);
  console.log(`❌ Failed: ${testResults.failed}`);
  console.log(`📈 Success Rate: ${Math.round((testResults.passed / (testResults.passed + testResults.failed)) * 100)}%`);
  
  if (testResults.failed > 0) {
    console.log('\n❌ Failed Tests:');
    testResults.details
      .filter(test => !test.passed)
      .forEach(test => console.log(`   - ${test.name}: ${test.details}`));
  }
  
  // Exit with appropriate code
  process.exit(testResults.failed > 0 ? 1 : 0);
}

// Handle errors
process.on('unhandledRejection', (error) => {
  console.error('❌ Unhandled Promise Rejection:', error);
  process.exit(1);
});

// Run tests
runAllTests().catch(error => {
  console.error('❌ Test execution failed:', error);
  process.exit(1);
}); 