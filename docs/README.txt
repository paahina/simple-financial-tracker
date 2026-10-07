SIMPLE FINANCIAL TRACKER
Planning Package
================

Recommended reading order:
1. 01_project_overview.txt
2. 02_features.txt
3. 03_tech_stack.txt
4. 04_architecture.txt
5. 05_data_model.txt
6. 06_api_spec.txt
7. 07_frontend_spec.txt
8. 08_security_rules.txt
9. 09_business_rules.txt
10. 10_development_roadmap.txt
11. 11_decisions_and_scope.txt
12. 12_storage_management.txt
13. 13_frontend_development_plan.txt
14. 14_backend_development_plan.txt

Implementation references:
- 13_frontend_development_plan.txt is the detailed frontend folder, module, layout,
  routing, state, and User/Admin UI/UX plan.
- 14_backend_development_plan.txt is the detailed backend MVC + Service Layer plan,
  including folder structure and responsibilities.

Core locked decisions:
- MERN
- JavaScript, not TypeScript
- MongoDB + Mongoose
- React + Express
- Transaction = INCOME / EXPENSE
- Transfer = separate entity
- Account rather than a standalone Balance entity
- Debt + separate DebtPayment
- Reports derived from source financial records
- No bank/e-wallet API integration for MVP
- No unnecessary microservices or over-engineering
- MongoDB TTL only for intentionally temporary data
- Never automatically delete financial history because it is old
- Frontend uses separate UserLayout and AdminLayout
- User UI uses a top navbar; Admin UI uses a persistent sidebar
- Backend uses MVC-style organization with a Service Layer

The package is intended to be the implementation baseline for the first MVP.
