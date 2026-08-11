# Architecture

## System Overview

```text
                  +-----------------------+
                  | Web UI (HTML/CSS/JS)  |
                  +-----------+-----------+
                              |
                              | HTTP
                              v
                  +---------+---------+
                  |   API Server      |
                  | Bun + TypeScript  |
                  +---------+---------+
                            |
          +--------+--------+--------+
          |        |        |        |
          v        v        v        v
     Gmail       Drive     Slack   Brain
     Service     Service   Service Service
          |        |        |        |
          +--------+--------+--------+
                            |
                            v
                        GBrain
                            |
                            v
                    PostgreSQL/pgvector