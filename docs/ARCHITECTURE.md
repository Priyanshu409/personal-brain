# Architecture

## System Overview

```text
                    +----------------+
                    |    React UI    |
                    +-------+--------+
                            |
                            | HTTP
                            v
                  +---------+---------+
                  |   API Server      |
                  | Bun + TypeScript  |
                  +---------+---------+
                            |
          +-----------------+-----------------+
          |                 |                 |
          v                 v                 v
     Gmail Service    Drive Service      Brain Service
          |                 |                 |
          +-----------------+-----------------+
                            |
                            v
                        GBrain
                            |
                            v
                    PostgreSQL/pgvector