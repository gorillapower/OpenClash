# Model Assessment Prompt

Use this prompt with another AI model when you want an independent critique of
the framework.

```md
I want you to assess a software delivery framework for AI-assisted development.

Framework name: AI-Compatible Development Rhythm

Summary:
- Repo-local framework docs define the operating profile for the project
- Durable product and contract truths live in `<framework-root>/decision/`
- Intended implementation structure lives in `<framework-root>/architecture/`
- Rolling roadmap and sequencing live in `<framework-root>/execution-plan.md`
- Bounded implementation work is executed through a strict work-item template with exact scope, references, acceptance criteria, and verification
- The operating rule is: if new implementation learning would cause future work to be written differently, refresh the relevant docs and plan before continuing

Please assess this framework from the perspective of:
1. strengths
2. weaknesses
3. failure modes
4. where it is overkill
5. where it is especially effective
6. how to improve it for use across projects and across AI models
7. what the minimal viable version should be

Important:
- Do not just praise it
- Compare it implicitly against ADRs, RFCs, issue-driven development, and normal agile backlog practices
- Focus on whether it reduces drift and improves execution quality
- Point out where the framework may create stale-document risk or process overhead
- Recommend a light, standard, and heavy version if appropriate
```
