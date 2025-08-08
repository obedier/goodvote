# GoodVote - Campaign Finance Transparency Platform

A comprehensive campaign finance transparency platform built with Next.js, leveraging Federal Election Commission (FEC) data to provide insights into political contributions, expenditures, and campaign finance patterns.

## 🎯 Project Overview

GoodVote is inspired by OpenSecrets.org and provides a modern, interactive platform for exploring campaign finance data. The platform leverages all 9 FEC data tables to provide a complete picture of campaign finance transparency.

### Key Features

- **Comprehensive FEC Data Integration** - All 9 FEC tables accessible
- **Interactive Data Exploration** - Search, filter, and analyze campaign finance data
- **State-Level Analysis** - "Get Local!" tool for state-specific data
- **Presidential Elections Tracking** - Detailed campaign finance analysis
- **PAC Database** - Complete Political Action Committee information
- **Person-Based Mapping** - Unifies candidates across election cycles
- **Mobile-Responsive Design** - Works seamlessly on all devices

## 🏗️ Architecture

### Technology Stack

- **Frontend**: Next.js 15, React 19, TypeScript
- **Styling**: Tailwind CSS 4
- **Database**: PostgreSQL with FEC data
- **Testing**: Custom test framework with Puppeteer
- **Charts**: Recharts for data visualization

### Database Schema

- **fec_gold**: Read-only FEC data (candidates, committees, contributions, expenditures)
- **goodvote**: Application database with views and person-based mapping
- **Views**: Bridge between FEC data and application

### Key Components

- **Layout**: Header, Footer, Navigation, Breadcrumbs
- **Pages**: Politicians, Elections, Lobbying, Search, About
- **Components**: Data tables, charts, filters, search forms
- **API Routes**: RESTful endpoints for data access
- **Utilities**: Database connections, data fetching, validation

<<<<<<< HEAD
**📖 For detailed database connection guidelines, see [docs/database-connection-guide.md](docs/database-connection-guide.md)**

## Getting Started
=======
## 🚀 Getting Started
>>>>>>> 30bd68b54e825a17d58735643b9eed34a5aba774

### Prerequisites

- Node.js 18+
- PostgreSQL database
- FEC data loaded in database

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd goodvote
   ```

2. **Install dependencies**
   ```bash
   cd goodvote-app
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env.local
   # Edit .env.local with your database credentials
   ```

4. **Start the development server**
   ```bash
   npm run dev
   ```

5. **Open your browser**
   Navigate to [http://localhost:3000](http://localhost:3000)

## 🧪 Testing

### Automated Tests

```bash
# Run all tests
npm run test

# Run specific test suites
npm run test:db      # Database connectivity and FEC data
npm run test:api     # API endpoints and response formats
npm run test:frontend # Frontend functionality and accessibility

# Quick setup validation
node scripts/quick-test.js
```

### Manual Testing

See [docs/manual-validation-checklist.md](docs/manual-validation-checklist.md) for a comprehensive 37-point manual testing checklist.

## 📊 FEC Data Integration

The platform integrates all 9 FEC data tables:

1. **candidate_master** - All candidates who filed with the FEC
2. **committee_master** - All committees (PACs, campaigns, parties)
3. **individual_contributions** - All individual contributions
4. **operating_expenditures** - All committee expenditures
5. **committee_transactions** - Committee-to-committee transactions
6. **candidate_committee_linkages** - Links candidates to committees
7. **pac_summary** - Summary financial data for PACs
8. **house_senate_current_campaigns** - Current campaign committees
9. **Additional FEC data tables** - Comprehensive coverage

## 🗺️ Project Structure

```
goodvote/
├── docs/                          # Documentation
│   ├── plan.md                   # Project plan and progress
│   ├── test-plan.md              # Testing strategy
│   ├── manual-validation-checklist.md
│   ├── fec_gold_schema.md    # Database schema
│   └── OpenSecrets spec.MD       # UX/UI specifications
├── goodvote-app/                  # Next.js application
│   ├── src/
│   │   ├── app/                  # App Router pages
│   │   │   ├── api/             # API routes
│   │   │   ├── elections/       # Elections pages
│   │   │   ├── lobbying/        # Lobbying pages
│   │   │   └── politicians/     # Politicians pages
│   │   ├── components/          # React components
│   │   ├── lib/                 # Utilities and database
│   │   └── types/               # TypeScript interfaces
│   ├── scripts/                 # Test scripts
│   └── package.json
└── README.md
```

## 🔧 API Endpoints

### Core Endpoints

- `GET /api/congress` - Congress members data
- `GET /api/contributions` - Individual contributions
- `GET /api/expenditures` - Committee expenditures
- `GET /api/pacs` - PAC data and summaries
- `GET /api/fec-overview` - FEC data overview
- `GET /api/state-data` - State-level campaign finance data

### Query Parameters

All endpoints support filtering by:
- `election_year` - Election cycle
- `party` - Political party
- `state` - State abbreviation
- `limit` - Number of results
- `offset` - Pagination offset

## 📈 Performance Benchmarks

### Page Load Times
- Homepage: < 2 seconds
- Congress listing: < 3 seconds
- PACs page: < 3 seconds
- FEC overview: < 4 seconds
- Get Local tool: < 3 seconds

### API Response Times
- Congress API: < 1 second
- Contributions API: < 2 seconds
- PACs API: < 2 seconds
- State data API: < 3 seconds

## 🔒 Compliance & Security

### FEC Data Usage
- Follows FEC data usage guidelines
- Proper data source attribution
- No commercial use of individual contributor data
- Educational/research purposes only

### Security Features
- Input validation and sanitization
- SQL injection prevention
- XSS attack protection
- Secure database connections

## 📚 Documentation

- **[Project Plan](docs/plan.md)** - Development phases and progress
- **[Test Plan](docs/test-plan.md)** - Testing strategy and methodology
- **[Manual Validation Checklist](docs/manual-validation-checklist.md)** - Comprehensive testing checklist
- **[Database Schema](docs/fec_gold_schema.md)** - FEC data structure
- **[OpenSecrets Specification](docs/OpenSecrets%20spec.MD)** - UX/UI design guidelines

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development Guidelines

- Follow TypeScript best practices
- Write comprehensive tests for new features
- Update documentation for API changes
- Ensure mobile responsiveness
- Maintain FEC compliance standards

## 📋 Testing Checklist

Before submitting changes, ensure:

- [ ] All automated tests pass (`npm run test`)
- [ ] Manual validation checklist completed
- [ ] Mobile responsiveness verified
- [ ] Accessibility standards met
- [ ] FEC compliance maintained
- [ ] Performance benchmarks met

## 🚀 Deployment

### Production Build

```bash
npm run build
npm start
```

### Environment Variables

Required environment variables:
- `DB_HOST` - Database host
- `DB_PORT` - Database port
- `DB_NAME` - Database name
- `DB_USER` - Database username
- `DB_PASSWORD` - Database password

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🙏 Acknowledgments

- **Federal Election Commission** - For providing comprehensive campaign finance data
- **OpenSecrets.org** - For inspiration in campaign finance transparency
- **Next.js Team** - For the excellent React framework
- **Tailwind CSS** - For the utility-first CSS framework

## 📞 Support

For questions, issues, or contributions:
- Create an issue in the repository
- Review the documentation in the `docs/` folder
- Check the test results for troubleshooting

---

**GoodVote** - Making campaign finance data accessible, transparent, and understandable for everyone. 