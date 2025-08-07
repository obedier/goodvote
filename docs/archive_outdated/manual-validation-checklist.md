# GoodVote Manual Validation Checklist

## Pre-Test Setup

### Environment Setup
- [ ] Node.js 18+ installed
- [ ] PostgreSQL database running
- [ ] FEC data loaded in database
- [ ] Environment variables configured
- [ ] Development server running (`npm run dev`)

### Dependencies
- [ ] All npm packages installed (`npm install`)
- [ ] Database connection working
- [ ] Test dependencies installed (puppeteer, node-fetch)

## Core Functionality Tests

### 1. Application Startup
- [ ] Application starts without errors
- [ ] No console errors in browser
- [ ] Database connection successful
- [ ] All pages load correctly

### 2. Navigation Testing
- [ ] Header navigation works on desktop
- [ ] Mobile menu works on mobile devices
- [ ] Breadcrumbs display correctly
- [ ] Footer links work
- [ ] Back/forward browser buttons work

### 3. Homepage Testing
- [ ] Hero section displays correctly
- [ ] Feature cards are visible
- [ ] Quick links work
- [ ] Stats section displays
- [ ] Call-to-action buttons work

## Database Integration Tests

### 4. FEC Data Access
- [ ] All 9 FEC tables accessible
- [ ] Congress members data loads
- [ ] Contributions data displays
- [ ] PACs data shows correctly
- [ ] Expenditures data available

### 5. Data Quality
- [ ] Currency formatting correct
- [ ] Numbers formatted properly
- [ ] Dates display correctly
- [ ] State/ZIP codes valid
- [ ] No null/undefined values displayed

### 6. Query Performance
- [ ] Congress page loads in < 3 seconds
- [ ] PACs page loads in < 3 seconds
- [ ] FEC overview loads in < 4 seconds
- [ ] Get Local tool responds in < 3 seconds

## Page-Specific Tests

### 7. Congress Members Page (`/politicians/congress`)
- [ ] Member list displays
- [ ] Filters work (party, chamber, state)
- [ ] Search functionality works
- [ ] Member cards show correct info
- [ ] Pagination works (if implemented)

### 8. PACs Page (`/lobbying/pacs`)
- [ ] PAC stats cards display
- [ ] PAC table shows data
- [ ] Filters work (election year, name, amounts)
- [ ] Top PACs functionality works
- [ ] Data source attribution present

### 9. FEC Overview Page (`/elections/overview`)
- [ ] All 9 FEC tables shown
- [ ] Record counts display
- [ ] Year selector works
- [ ] Table descriptions accurate
- [ ] Quick links work

### 10. Get Local Tool (`/elections/get-local`)
- [ ] State selector works
- [ ] ZIP code search works
- [ ] State data displays
- [ ] Party breakdown shows
- [ ] Top cities/contributors display
- [ ] Elected officials link works

### 11. Presidential Elections (`/elections/presidential`)
- [ ] Year selector works
- [ ] Candidate profiles display
- [ ] Financial data shows
- [ ] State/industry breakdowns work
- [ ] Historical context displays

## API Endpoint Tests

### 12. Congress API (`/api/congress`)
- [ ] Returns congress members
- [ ] Filters work (party, chamber, state)
- [ ] Response format correct
- [ ] Performance acceptable (< 1 second)

### 13. Contributions API (`/api/contributions`)
- [ ] Returns contribution data
- [ ] Filters work (year, amounts, names)
- [ ] Response format correct
- [ ] Performance acceptable (< 2 seconds)

### 14. PACs API (`/api/pacs`)
- [ ] Returns PAC data
- [ ] Top PACs action works
- [ ] Filters work correctly
- [ ] Response format correct

### 15. State Data API (`/api/state-data`)
- [ ] State data returns
- [ ] ZIP code search works
- [ ] Aggregation functions work
- [ ] Performance acceptable (< 3 seconds)

### 16. FEC Overview API (`/api/fec-overview`)
- [ ] All 9 tables counted
- [ ] Year filtering works
- [ ] Response format correct
- [ ] Performance acceptable (< 3 seconds)

## User Experience Tests

### 17. Mobile Responsiveness
- [ ] All pages work on mobile
- [ ] Navigation adapts to mobile
- [ ] Tables scroll horizontally
- [ ] Touch interactions work
- [ ] Text readable on small screens

### 18. Loading States
- [ ] Loading spinners display
- [ ] Error states show properly
- [ ] Empty states handled
- [ ] Progress indicators work

### 19. Accessibility
- [ ] Alt text on images
- [ ] ARIA labels present
- [ ] Semantic HTML used
- [ ] Keyboard navigation works
- [ ] Screen reader compatible

### 20. Performance
- [ ] Page load times acceptable
- [ ] API response times good
- [ ] No memory leaks
- [ ] Smooth scrolling
- [ ] No layout shifts

## Compliance Tests

### 21. FEC Data Usage
- [ ] FEC attribution present
- [ ] Data usage guidelines followed
- [ ] No commercial use of individual data
- [ ] Proper disclaimers shown

### 22. Privacy
- [ ] No personal data exposed
- [ ] Proper data handling
- [ ] No tracking without consent
- [ ] Privacy policy accessible

### 23. Data Accuracy
- [ ] FEC data matches source
- [ ] Calculations correct
- [ ] No data corruption
- [ ] Timestamps accurate

## Error Handling Tests

### 24. Database Errors
- [ ] Connection errors handled
- [ ] Query errors caught
- [ ] Timeout errors managed
- [ ] User-friendly error messages

### 25. API Errors
- [ ] 404 errors handled
- [ ] 500 errors caught
- [ ] Invalid parameters rejected
- [ ] Rate limiting respected

### 26. Frontend Errors
- [ ] JavaScript errors caught
- [ ] Network errors handled
- [ ] Malformed data handled
- [ ] Graceful degradation

## Browser Compatibility

### 27. Chrome/Chromium
- [ ] All features work
- [ ] No console errors
- [ ] Performance good
- [ ] Responsive design works

### 28. Firefox
- [ ] All features work
- [ ] No console errors
- [ ] Performance good
- [ ] Responsive design works

### 29. Safari
- [ ] All features work
- [ ] No console errors
- [ ] Performance good
- [ ] Responsive design works

### 30. Edge
- [ ] All features work
- [ ] No console errors
- [ ] Performance good
- [ ] Responsive design works

## Security Tests

### 31. Input Validation
- [ ] SQL injection prevented
- [ ] XSS attacks blocked
- [ ] Parameter validation works
- [ ] Sanitization applied

### 32. Data Protection
- [ ] Sensitive data not exposed
- [ ] Proper access controls
- [ ] Secure connections used
- [ ] No data leakage

## Documentation Tests

### 33. Code Documentation
- [ ] Functions documented
- [ ] API endpoints documented
- [ ] Database schema documented
- [ ] README updated

### 34. User Documentation
- [ ] Help text present
- [ ] Data source notes
- [ ] Methodology explained
- [ ] Contact information available

## Final Validation

### 35. End-to-End Testing
- [ ] Complete user journey works
- [ ] Data flows correctly
- [ ] All features integrated
- [ ] No broken links

### 36. Performance Benchmarking
- [ ] Meets performance targets
- [ ] Scalability tested
- [ ] Load testing done
- [ ] Optimization applied

### 37. Deployment Readiness
- [ ] Build process works
- [ ] Environment variables set
- [ ] Production configuration ready
- [ ] Monitoring in place

## Test Results Documentation

### Test Report Template
```
Test Date: [Date]
Test Environment: [Environment]
Tester: [Name]
Application Version: [Version]

Core Functionality: [PASS/FAIL]
Database Integration: [PASS/FAIL]
Page Functionality: [PASS/FAIL]
API Endpoints: [PASS/FAIL]
User Experience: [PASS/FAIL]
Compliance: [PASS/FAIL]
Security: [PASS/FAIL]

Issues Found:
1. [Issue description and severity]
2. [Issue description and severity]

Recommendations:
1. [Recommendation]
2. [Recommendation]

Overall Assessment: [PASS/FAIL]
Ready for Production: [YES/NO]
```

## Test Execution Notes

### Running Automated Tests
```bash
# Run all tests
npm run test

# Run specific test suites
npm run test:db
npm run test:api
npm run test:frontend

# Run comprehensive test suite
npm run test:all
```

### Manual Test Execution
1. Start the development server: `npm run dev`
2. Open browser to `http://localhost:3000`
3. Go through each checklist item systematically
4. Document any issues found
5. Generate test report

### Test Environment Requirements
- Modern web browser (Chrome, Firefox, Safari, Edge)
- Mobile device or browser dev tools for mobile testing
- Database with FEC data loaded
- Stable internet connection
- Development server running

### Test Data Requirements
- Sample FEC data for multiple election years
- Test candidates and committees
- Sample contributions and expenditures
- State-level data for all 50 states
- Various data scenarios (empty, large datasets, etc.) 