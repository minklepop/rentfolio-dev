# Rentfolio, diagrams for discussion

Paste any block into [mermaid.live](https://mermaid.live) for an instant image, or open this
file's preview in VS Code (Markdown Preview Mermaid Support renders it inline).

## 1. Core relational schema (the "3 properties, 2 tenants" walkthrough)

The minimum set of tables that explain how rent collection actually works, this is the one
to put in front of Giri first. The key point: a `Lease` doesn't store a tenant directly: it
goes through `LeaseTenant`, a join table, because a lease can have more than one tenant and
the schema needs to support that without duplicating lease rows.

```mermaid
erDiagram
    PROPERTY ||--o{ UNIT : "has many"
    UNIT ||--o{ LEASE : "has many over time"
    LEASE ||--o{ LEASE_TENANT : "has"
    USER ||--o{ LEASE_TENANT : "has"
    LEASE ||--o{ CHARGE : "generates monthly"
    CHARGE ||--o{ PAYMENT : "paid by"

    PROPERTY {
        string name
        string address
    }
    UNIT {
        string label
        int marketRentCents
    }
    LEASE {
        date startDate
        int rentCents
        string status
    }
    USER {
        string name
        string role "LANDLORD or TENANT"
    }
    CHARGE {
        string type "RENT, DEPOSIT, LATE_FEE..."
        int amountCents
        date dueDate
    }
    PAYMENT {
        int amountCents
        date paidDate
        string method
    }
```

**The thing that directly answers his "$6k over 3 months, can't tell which payment was for
which month" problem:** every `Payment` row has a `chargeId` pointing at one specific
`Charge`. Balance owed on any charge is just `amountCents - SUM(linked payments)`. Nothing
free-floats the way a bank CSV does.

## 2. Full schema (every table, for reference)

Everything in `prisma/schema.prisma`, for whenever the conversation goes deeper than the
core flow above.

```mermaid
erDiagram
    PROPERTY ||--o{ UNIT : "has"
    PROPERTY ||--o{ EXPENSE : "has"
    PROPERTY ||--o{ DOCUMENT : "has (optional)"
    UNIT ||--o{ LEASE : "has"
    UNIT ||--o{ LISTING : "has"
    UNIT ||--o{ MAINTENANCE_REQUEST : "has"
    LEASE ||--o{ LEASE_TENANT : "has"
    USER ||--o{ LEASE_TENANT : "has"
    LEASE ||--o{ CHARGE : "has"
    LEASE ||--o{ PAYMENT : "has"
    LEASE ||--o{ DOCUMENT : "has (optional)"
    CHARGE ||--o{ PAYMENT : "paid by"
    USER ||--o{ MAINTENANCE_REQUEST : "files (optional)"
    USER ||--o{ MAINTENANCE_COMMENT : "writes (optional)"
    MAINTENANCE_REQUEST ||--o{ MAINTENANCE_COMMENT : "has"
    LISTING ||--o{ LISTING_PHOTO : "has"
    LISTING ||--o{ APPLICATION : "receives"
    LISTING ||--o{ LEAD : "receives"

    PROPERTY {
        string id PK
        string name
        string address1
        string city
        string state
        string zip
        string type
    }
    UNIT {
        string id PK
        string propertyId FK
        string label
        int beds
        float baths
        int marketRentCents
    }
    LEASE {
        string id PK
        string unitId FK
        date startDate
        date endDate
        int rentCents
        int depositCents
        int rentDueDay
        int lateFeeCents
        string status
    }
    USER {
        string id PK
        string email
        string name
        string role
        bool totpEnabled
    }
    LEASE_TENANT {
        string leaseId FK
        string userId FK
    }
    CHARGE {
        string id PK
        string leaseId FK
        string type
        int amountCents
        date dueDate
        string linkedChargeId FK "self-ref: late fee points at the rent charge it's for"
    }
    PAYMENT {
        string id PK
        string leaseId FK
        string chargeId FK
        int amountCents
        date paidDate
        string method
    }
    MAINTENANCE_REQUEST {
        string id PK
        string unitId FK
        string createdById FK
        string title
        string priority
        string status
    }
    MAINTENANCE_COMMENT {
        string id PK
        string requestId FK
        string authorId FK
        string body
    }
    LISTING {
        string id PK
        string unitId FK
        string slug
        string title
        int rentCents
        string status
    }
    LISTING_PHOTO {
        string id PK
        string listingId FK
        string filename
    }
    APPLICATION {
        string id PK
        string listingId FK
        string fullName
        string email
        int monthlyIncomeCents
        string status
    }
    LEAD {
        string id PK
        string listingId FK
        string name
        string source
        string status
    }
    EXPENSE {
        string id PK
        string propertyId FK
        date date
        int amountCents
        string category
    }
    DOCUMENT {
        string id PK
        string propertyId FK
        string leaseId FK
        string name
        bool requiresSignature
        date signedAt
    }
    RESOURCE {
        string id PK
        string label
        string url
        string category
    }
```

`RESOURCE` is intentionally standalone, saved links (court lookups, screening sites), not
tied to any other table.

## 3. Rent lifecycle (what actually happens each month)

```mermaid
sequenceDiagram
    participant L as Lease
    participant C as Charge
    participant P as Payment

    Note over L: 1st of the month (or app first opened that month)
    L->>C: auto-generate RENT charge for this month
    Note over C: Charge status = DUE

    alt Tenant pays on time
        P->>C: payment recorded, linked to this charge
        Note over C: balance = amountCents - payments = 0 → PAID
    else Still unpaid after grace period
        C->>C: auto-generate linked LATE_FEE charge
        Note over C: now two charges outstanding: RENT + LATE_FEE
        P->>C: partial or full payment recorded
        Note over C: balance recalculated per charge, every time
    end
```

## 4. Listing → lead/application → lease funnel

```mermaid
flowchart LR
    Listing[Published Listing] --> Lead[Lead<br/>quick inquiry form]
    Listing --> App[Application<br/>full form]
    Lead -->|landlord follows up| App
    App -->|approved| TenantAcct[Tenant account created]
    TenantAcct --> Lease[Lease created]
    Lease --> Charges[Monthly charges begin]
```

## 5. System architecture (how it's actually hosted)

```mermaid
flowchart LR
    Browser -->|HTTPS| Next[Next.js server<br/>one Node process]
    Next -->|Server Components read| Prisma[Prisma Client]
    Next -->|Server Actions write| Prisma
    Prisma --> SQLite[(SQLite file<br/>prisma/dev.db)]
    Next --> Uploads[/uploads folder/]
    Next -.optional.-> SMTP[SMTP provider<br/>weekly digest]
    Next -.optional.-> Claude[Anthropic API<br/>Ask the data]
```

One process, one file-based database, one folder of uploads. No separate database server,
no auth provider, no payment processor in the core path, that's what makes "self-hosted and
free" actually true rather than free-with-asterisks.
