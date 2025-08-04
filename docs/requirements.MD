Perfect — let’s update your requirements document into a detailed, implementation-ready spec for a fully functional Israel Lobby Influence Dashboard built on top of your local PostgreSQL instance with FEC data (2020–2026). I’ll incorporate everything we’ve learned so far — candidate ID handling, Bioguide mapping, scoring models, PAC list, and frontend experience.
 
📋 Requirements Document
Project: Israel Lobby Influence Dashboard
Primary Objective: Provide US voters, journalists, and researchers with transparent, district-by-district visibility into the influence of the Israel Lobby (e.g., AIPAC and affiliated PACs) on federal elections and incumbents, starting with the 119th Congress and extending to candidates for 2026.
 
🎯 Core Objective
Empower voters concerned with Palestinian human rights to:
1.	Identify pro-Israel vs. pro-Palestine candidates at all federal levels.
2.	Understand how much Israel-aligned money is involved in their elections.
3.	Track endorsements, voting records, and lobby expenditures.
4.	Provide actionable tools to volunteer, donate, and share content for aligned candidates.
 
✅ Primary User Requirements
1. Voter View (Phase One MVP)
Interactive Map Dashboard
•	Default View: Human Rights / Israel Influence
o	Color-code each congressional district:
	🔴 Red: Candidate/Incumbent supported by Israel Lobby PACs or endorsed.
	🟢 Green: Candidate pledged no Israel Lobby funding or aligned with pro-Palestinian stance.
	⚪ Gray: Not enough data.
o	Methodology:
	75% weight: Lobby contributions (FEC PAC + SuperPAC data).
	25% weight: Voting record (Congress.gov roll calls).
o	On click: Show candidate bio + influence metrics.
Alternate Views
•	Party Lean (Cook PVI): Districts shaded by partisan lean.
•	Upcoming Races View: Color-coded by most likely winning candidate’s stance, with:
o	Race type & date (Primary/General/Runoff).
o	Candidate list with financial totals.
o	Israel Lobby contributions & endorsements.
o	Win probability (based on funds + polls).
o	Links to polling data.
Action-Oriented Dashboard (Phase Two)
•	Save/favorite candidates and races.
•	Volunteer sign-ups & donation redirects.
•	Share pre-generated content to social media.
•	Sign petitions / subscribe to protest events.
________________________________________
2. Political Campaigns / PACs (Secondary Users)
•	Self-report stances.
•	Upload signed pledges not to accept lobby funds.
•	Provide campaign materials for voter education.
________________________________________
3. Journalists / Researchers
•	Access transparent reports of lobby influence.
•	Export data for fact-checking and analysis.
•	Use as a primary reference for coverage of elections.
________________________________________
📌 Data Sources & Strategy
1. FEC Data (Local Postgres)
•	Tables to extract:
o	cand.txt / candidate_master → Candidate names, IDs, office, district.
o	pas2 / committee contributions → PAC-to-candidate contributions.
o	independentexpenditure.csv → SuperPAC spending (support/oppose).
o	committee_master → Identify AIPAC & affiliates by FEC IDs.
PACs to Include
•	AIPAC PAC (C00797670)
•	United Democracy Project (UDP) (C00799031)
•	NORPAC (C00247403)
•	DMFI PAC (C00710848)
•	Pro-Israel America PAC (C00741792)
•	Republican Jewish Coalition PAC (C00142299)
•	JACPAC
•	Other known pro-Israel committees (expandable via committee_master).
Rule:
➡ Any contribution from pro-Israel PACs = “Pro-Israel Supported”
________________________________________
2. Congressional Voting Records
•	Use Congress.gov Roll Call API for pro-Israel votes:
o	Military aid bills (Iron Dome, etc.).
o	Anti-BDS resolutions.
o	Aid-to-Israel appropriation bills.
•	Score 25% of influence rating from votes.
________________________________________
3. Cook PVI
•	Import Cook Political Report PVI scores (CSV or subscription dataset).
•	Used for Party Lean visualization.
________________________________________
4. Bioguide ID Integration
•	For incumbents: Link multiple FEC cand_ids to a single bioguide_id.
•	For challengers/non-elected: Create deterministic person_id using normalized name + state + year.
•	Ensures continuity when candidates run for multiple offices.
________________________________________
🧮 Scoring Model
Metric	Source	Weight	Rule
Lobby Contributions	FEC PAC + SuperPAC	75%	Any $$ = Pro-Israel Supported (red flag)
Endorsements	PAC websites	20%	AIPAC/DMFI/Pro-Israel America endorsement
Voting Record	Congress.gov	25%	Yea on pro-Israel bills
Party Lean	Cook PVI	Contextual	Not scored, but shown in alternate view
Threshold:
•	Red: Lobby-backed OR endorsed.
•	Green: Signed no-lobby pledge OR proven pro-Palestine stance.
•	Gray: Insufficient data.
________________________________________
🏗️ Technical Implementation
Database (PostgreSQL)
•	Tables
o	candidates → (cand_id, person_id, name, state, district, bioguide_id, party)
o	pac_contributions → (committee_id, cand_id, amount, cycle, support/oppose)
o	votes → (rollcall_id, bioguide_id, bill_id, position)
o	endorsements → (person_id, pac, cycle, endorsement_type)
o	districts → (state, district, cook_pvi, geojson)
________________________________________
Backend (FastAPI or Express)
•	API Endpoints
o	/api/districts → Map data (lean, lobby influence)
o	/api/candidates/{cand_id} → Candidate detail (bio, funding, votes)
o	/api/races → Upcoming races with candidate standings
o	/api/endorsements → Endorsement listings
o	/api/ai/recommendations → Suggested voter actions
 
Frontend (Next.js 15 + Mapbox)
•	Views
o	Map Page: Vector tiles for districts, colored by influence.
o	District Detail Panel: Shows incumbents, contributions, voting record.
o	Candidate Pages: Financial totals, donors, endorsements, win chance.
o	Dashboard: Favorites, volunteer actions, petitions.
 
Automation
•	Ingestion Jobs
o	Weekly: FEC PAC contributions & expenditures.
o	Monthly: Cook PVI updates.
o	Real-time: Roll call votes.
•	Data Normalization
o	Deduplicate candidates → unify cand_ids under person_id.
o	Normalize Israel Lobby PAC list.
o	Tag contributions as pro-Israel support.
 
📊 Deliverables
1.	Database schema for candidates, contributions, votes, and endorsements.
2.	ETL scripts for parsing FEC bulk data into Postgres.
3.	REST API for frontend queries.
4.	Interactive map dashboard with issue-based color coding.
5.	User dashboard (Phase Two) for actions and mobilization.

