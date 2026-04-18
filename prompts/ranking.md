# Ranking Prompt Placeholder

Used by Ranking Agent to evaluate and score knowledge items.

## Rules (to implement)
- Vendor docs score highest (authority_score >= 0.9)
- Scientific sources score medium (authority_score 0.6–0.89)
- Community sources are supporting only (authority_score < 0.6)
- Recency: items older than 2 years get a 0.1 score penalty
- evidence_strength maps: strong=1.0, moderate=0.7, weak=0.4, anecdotal=0.2
- Flag contradictions; do not hide them
