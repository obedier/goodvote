# GoodVote - Campaign Finance Transparency Platform

A Next.js web application that provides comprehensive campaign finance transparency by leveraging FEC data in a PostgreSQL database, following the OpenSecrets.org user experience model.

## Features

- **Politicians Section**: Browse members of Congress, state officials, and personal finances
- **Elections Section**: Track campaign finance by race type, outside spending, and local contributions
- **Lobbying & Groups**: Explore PACs, organizations, revolving door profiles, and foreign influence
- **Search & Data Exploration**: Global search with autocomplete, donor lookup, and contribution tracking
- **Data Visualization**: Interactive charts and tables for campaign finance analysis
- **API Access**: RESTful API for programmatic data access

## Tech Stack

- **Frontend**: Next.js 14, TypeScript, Tailwind CSS
- **Database**: PostgreSQL with FEC data
- **Charts**: Recharts for data visualization
- **Icons**: Lucide React
- **Search**: Full-text search with autocomplete

## Database Schema

The application uses two main databases:

### fec_gold (Read-only FEC data)
- `candidate_master`: All candidates who filed with the FEC
- `committee_master`: All committees (PACs, campaigns, parties)
- `individual_contributions`: All individual contributions
- `operating_expenditures`: All committee expenditures
- `committee_transactions`: Committee-to-committee transactions
- `candidate_committee_linkages`: Links candidates to committees

### goodvote (Application database)
- `persons`: Master table of unique persons
- `person_candidates`: Links persons to FEC candidate records
- Views: `fec_contributions`, `fec_committees`, `fec_candidates`, etc.

**📖 For detailed database connection guidelines, see [docs/database-connection-guide.md](docs/database-connection-guide.md)**

## Getting Started

### Prerequisites

- Node.js 18+ 
- PostgreSQL 12+
- FEC data loaded in `fec_gold` database
- Person-based mapping data in `goodvote` database

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd goodvote-app
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env.local
```

Edit `.env.local` with your database configuration:
```
DB_HOST=localhost
DB_PORT=5432
DB_NAME=goodvote
DB_USER=postgres
DB_PASSWORD=your_password
```

4. Run the development server:
```bash
npm run dev
```

5. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Database Setup

### 1. FEC Data Import

Import FEC bulk data into the `fec_gold` database:

```sql
-- Create fec_gold database
CREATE DATABASE fec_gold;

-- Import FEC data files (cn.txt, cm.txt, itcont.txt, etc.)
-- Follow FEC Complete Database Schema documentation
```

### 2. Application Database Setup

Create the `goodvote` database and views:

```sql
-- Create goodvote database
CREATE DATABASE goodvote;

-- Create views to access FEC data
CREATE VIEW fec_contributions AS
SELECT * FROM fec_gold.individual_contributions;

CREATE VIEW fec_committees AS
SELECT * FROM fec_gold.committee_master;

CREATE VIEW fec_candidates AS
SELECT * FROM fec_gold.candidate_master;

-- Create person-based mapping tables
-- See FEC Complete Schema documentation for full setup
```

## Project Structure

```
src/
├── app/                    # Next.js app router
│   ├── api/               # API routes
│   ├── politicians/       # Politicians pages
│   ├── elections/         # Elections pages
│   └── lobbying/          # Lobbying pages
├── components/            # React components
│   ├── layout/           # Layout components
│   └── ui/               # UI components
├── lib/                  # Utilities and database
└── types/                # TypeScript interfaces
```

## API Endpoints

### Congress Members
- `GET /api/congress` - List current Congress members with filters

### Contributions
- `GET /api/contributions` - Search FEC contributions with filters

### Search
- `GET /api/search` - Global search across politicians, donors, committees

## Development

### Code Style

- TypeScript for type safety
- Tailwind CSS for styling
- Component-based architecture
- API-first design

### Database Best Practices

- Always filter by `election_year` when querying FEC data
- Use `candidate_committee_linkages` to properly link candidates to committees
- Join with `committee_master` to get committee names and types
- Consider data lag (FEC data is 30-60 days behind real-time)

### Performance Considerations

- Database indexing on `election_year`, `committee_id`, `candidate_id`
- Use `LIMIT` clauses for large result sets
- Implement caching for frequently accessed data
- Pagination for large datasets

## Deployment

### Environment Variables

Required environment variables:
- `DB_HOST`: PostgreSQL host
- `DB_PORT`: PostgreSQL port
- `DB_NAME`: Database name
- `DB_USER`: Database user
- `DB_PASSWORD`: Database password

### Build

```bash
npm run build
npm start
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- Federal Election Commission for campaign finance data
- OpenSecrets.org for the user experience model
- Next.js team for the excellent framework

## Support

For questions or support, please refer to the project documentation or contact the development team.
