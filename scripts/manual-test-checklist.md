# GoodVote Manual Testing Checklist

## Pre-Testing Setup
- [ ] Development server is running (`npm run dev`)
- [ ] Database connections are working
- [ ] All automated tests have passed
- [ ] Browser is ready (Chrome/Firefox/Safari)

## 1. Homepage & Navigation Testing

### Header Navigation
- [ ] **Politicians** dropdown menu works
  - [ ] Congress members link works
  - [ ] State officials link works
  - [ ] Personal finances link works
- [ ] **Elections** dropdown menu works
  - [ ] Overview link works
  - [ ] Presidential elections link works
  - [ ] Congressional elections link works
  - [ ] Outside spending link works
  - [ ] Get Local! link works
- [ ] **Lobbying & Groups** dropdown menu works
  - [ ] Overview link works
  - [ ] PACs link works
  - [ ] Organizations link works
  - [ ] Revolving door link works
  - [ ] Foreign lobby link works
- [ ] **Learn** link works
- [ ] **About** link works
- [ ] **Search** icon opens search overlay
- [ ] Mobile hamburger menu works

### Footer
- [ ] All footer links are functional
- [ ] Contact information is correct
- [ ] Social media links work
- [ ] Newsletter signup form works

### Breadcrumbs
- [ ] Breadcrumbs appear on all pages
- [ ] Breadcrumb navigation works
- [ ] Breadcrumbs show correct hierarchy

## 2. Search Functionality Testing

### Global Search
- [ ] Search overlay opens when clicking search icon
- [ ] Search input field is functional
- [ ] Search suggestions appear as you type
- [ ] Popular searches are displayed
- [ ] Search filters work (Politicians, Organizations, Donors, News)
- [ ] Search results are relevant
- [ ] Search results can be filtered
- [ ] Search results can be sorted
- [ ] Search results can be exported

### Search Suggestions
- [ ] Autocomplete suggestions appear
- [ ] Popular searches are clickable
- [ ] Recent searches are saved
- [ ] Search suggestions are relevant

### Advanced Search
- [ ] Advanced filters work
- [ ] Date range filters work
- [ ] Amount range filters work
- [ ] State filters work
- [ ] Party filters work
- [ ] Election year filters work

## 3. Politicians Section Testing

### Congress Members Page
- [ ] Page loads without errors
- [ ] Congress members table displays correctly
- [ ] Filtering by party works
- [ ] Filtering by chamber works
- [ ] Filtering by state works
- [ ] Sorting by columns works
- [ ] Pagination works
- [ ] Export functionality works

### Individual Politician Profiles
- [ ] Politician profile pages load correctly
- [ ] All tabs work (Summary, Elections, Industries, PACs, Contributors, Geography, Demographics, Expenditures)
- [ ] Campaign finance data is accurate
- [ ] Top contributors list is displayed
- [ ] Top industries list is displayed
- [ ] Election cycle selector works
- [ ] Profile type selector works (campaign committee, leadership PAC, combined)
- [ ] Charts and visualizations render correctly
- [ ] Data export works

### State Officials
- [ ] State officials page loads
- [ ] State selection works
- [ ] Governor profiles work
- [ ] State legislature data works
- [ ] Judicial officeholders work

## 4. Elections Section Testing

### Elections Overview
- [ ] Overview page loads correctly
- [ ] Election cycle selector works
- [ ] Summary statistics are accurate
- [ ] Charts and visualizations work
- [ ] Links to detailed data work

### Presidential Elections
- [ ] Presidential elections page loads
- [ ] Candidate list is displayed
- [ ] Fundraising totals are accurate
- [ ] Candidate profiles work
- [ ] Historical data is available

### Congressional Elections
- [ ] Congressional elections page loads
- [ ] House and Senate races are listed
- [ ] Race details are accurate
- [ ] Candidate comparisons work
- [ ] District maps work (if available)

### Outside Spending
- [ ] Outside spending page loads
- [ ] Spending by cycle is displayed
- [ ] Spending by type works
- [ ] Top outside spending groups are listed
- [ ] Dark money tracking works
- [ ] Category breakdowns work

### Get Local! Tool
- [ ] Get Local! page loads
- [ ] State selection works
- [ ] ZIP code lookup works
- [ ] State-level data is displayed
- [ ] Elected officials links work
- [ ] Money maps work (if available)

## 5. Lobbying & Groups Section Testing

### Lobbying Overview
- [ ] Overview page loads correctly
- [ ] Total lobbying spending is displayed
- [ ] Spending by sector works
- [ ] Year selector works
- [ ] State filters work

### PACs Database
- [ ] PACs page loads correctly
- [ ] PAC search works
- [ ] PAC profiles are detailed
- [ ] Financial data is accurate
- [ ] Contribution analysis works
- [ ] Top PACs list is accurate

### Organizations
- [ ] Organizations page loads
- [ ] Organization search works
- [ ] Organization profiles are detailed
- [ ] Lobbying spending is tracked
- [ ] Industry classifications work

### Revolving Door
- [ ] Revolving door page loads
- [ ] Former officials search works
- [ ] Current employers are listed
- [ ] Transition tracking works
- [ ] Ethics data is displayed

### Foreign Lobby
- [ ] Foreign lobby page loads
- [ ] Country filters work
- [ ] Foreign client data is displayed
- [ ] Spending by country works
- [ ] Registration data is accurate

## 6. Data Visualization Testing

### Charts and Graphs
- [ ] All charts render correctly
- [ ] Interactive charts respond to user input
- [ ] Chart legends are accurate
- [ ] Data tooltips work
- [ ] Chart exports work

### Tables
- [ ] All tables display correctly
- [ ] Sorting works on all columns
- [ ] Filtering works
- [ ] Pagination works
- [ ] Export to CSV works
- [ ] Export to JSON works

### Maps
- [ ] Geographic visualizations work
- [ ] State-level data is displayed
- [ ] District maps work (if available)
- [ ] Interactive map features work

## 7. Data Export Testing

### Export Functionality
- [ ] CSV export works for all data tables
- [ ] JSON export works for all data tables
- [ ] Export file sizes are reasonable
- [ ] Exported data is accurate
- [ ] Export includes all relevant fields

### Data Accuracy
- [ ] Campaign finance totals match FEC data
- [ ] Contribution amounts are accurate
- [ ] Expenditure categories are correct
- [ ] Outside spending calculations are accurate
- [ ] PAC financial data is correct

## 8. Performance Testing

### Page Load Times
- [ ] Homepage loads in under 3 seconds
- [ ] Search results load in under 2 seconds
- [ ] Data tables load in under 5 seconds
- [ ] Charts render in under 3 seconds
- [ ] Export operations complete in reasonable time

### Responsive Design
- [ ] Site works on desktop (1920x1080)
- [ ] Site works on laptop (1366x768)
- [ ] Site works on tablet (768x1024)
- [ ] Site works on mobile (375x667)
- [ ] Navigation adapts to screen size
- [ ] Tables are responsive
- [ ] Charts are responsive

## 9. Accessibility Testing

### Keyboard Navigation
- [ ] All interactive elements are keyboard accessible
- [ ] Tab order is logical
- [ ] Focus indicators are visible
- [ ] Skip links work

### Screen Reader Compatibility
- [ ] All images have alt text
- [ ] Tables have proper headers
- [ ] Form labels are associated
- [ ] ARIA labels are used where appropriate

### Color Contrast
- [ ] Text has sufficient contrast
- [ ] Links are distinguishable
- [ ] Error messages are visible
- [ ] Success messages are visible

## 10. Error Handling Testing

### Network Errors
- [ ] API errors are handled gracefully
- [ ] Loading states are displayed
- [ ] Error messages are user-friendly
- [ ] Retry mechanisms work

### Invalid Input
- [ ] Invalid search queries are handled
- [ ] Invalid filters are rejected
- [ ] Form validation works
- [ ] Error messages are helpful

### Missing Data
- [ ] Pages load even with missing data
- [ ] Placeholder content is displayed
- [ ] "No data available" messages are shown
- [ ] Graceful degradation works

## 11. Browser Compatibility Testing

### Desktop Browsers
- [ ] Chrome (latest)
- [ ] Firefox (latest)
- [ ] Safari (latest)
- [ ] Edge (latest)

### Mobile Browsers
- [ ] Chrome Mobile
- [ ] Safari Mobile
- [ ] Firefox Mobile

## 12. Known Issues to Verify

### Expected Issues (Should Work)
- [ ] State data API returns 400 for invalid parameters (expected)
- [ ] PAC financial data may have null values (known issue)
- [ ] Some lobbying data may be mock data (ready for real data)
- [ ] Frontend pages may have JavaScript hydration issues (APIs working)

### Issues to Fix
- [ ] Donor API errors (needs debugging)
- [ ] Frontend loading states (JavaScript hydration)
- [ ] PAC financial data investigation needed

## 13. Final Validation

### Data Integrity
- [ ] All FEC data matches official sources
- [ ] Calculations are mathematically correct
- [ ] Date ranges are accurate
- [ ] Currency formatting is consistent

### User Experience
- [ ] Navigation is intuitive
- [ ] Search is effective
- [ ] Data is easy to understand
- [ ] Export functionality is useful

### Performance
- [ ] No major performance issues
- [ ] Memory usage is reasonable
- [ ] Database queries are optimized
- [ ] Caching is effective

## Test Results Summary

**Date:** _______________
**Tester:** _______________
**Browser:** _______________
**Device:** _______________

**Passed Tests:** ___ / ___
**Failed Tests:** ___ / ___
**Success Rate:** ___%

**Critical Issues Found:**
1. ________________
2. ________________
3. ________________

**Minor Issues Found:**
1. ________________
2. ________________
3. ________________

**Recommendations:**
1. ________________
2. ________________
3. ________________

**Overall Assessment:**
- [ ] Ready for deployment
- [ ] Needs minor fixes
- [ ] Needs major fixes
- [ ] Not ready for deployment

**Notes:**
_________________________________________________________________
_________________________________________________________________
_________________________________________________________________ 