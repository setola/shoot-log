---
name: release-check
description: "Prepara un rilascio sicuro e deterministico in questo repo: controlla stato git, esegue lint/test/build, propone un commit message e aspetta l'ok esplicito prima di fare commit. Use when the user asks to release, prepare a commit, finalize updates, or run the release-check procedure."
---

# Release Check

Usa questa skill per preparare un commit di rilascio nel repo `shooting-logbook` senza fare push/deploy automatici.

## Principi

- Non mostrare il diff completo: l'utente lo controlla dall'IDE.
- Non fare mai `git commit` senza ok esplicito dell'utente.
- Non fare mai `git push` senza un secondo ok esplicito separato.
- Non modificare file durante la release check, salvo richiesta esplicita dell'utente.
- Se un check fallisce, fermati: spiega il fallimento e proponi il fix, ma non committare.

## Procedura standard

1. Controlla lo stato:

   ```bash
   git status --short
   ```

2. Riassumi i file modificati in modo compatto, senza diff completo.

3. Esegui i check, in quest'ordine:

   ```bash
   npm run lint
   npm run test
   npm run build
   ```

4. Se tutti i check passano, prepara una proposta di commit message in formato Conventional Commits, ad esempio:

   ```text
   fix: improve mobile competitor search suggestions
   ```

5. Mostra all'utente:

   - stato git compatto;
   - check eseguiti e risultato;
   - commit message proposta;
   - comando che verrà eseguito.

6. Fermati e chiedi conferma esplicita:

   ```text
   Vuoi che proceda con il commit usando questo messaggio?
   ```

7. Solo se l'utente conferma chiaramente, esegui:

   ```bash
   git add <file-modificati-rilevanti>
   git commit -m "<messaggio approvato>"
   ```

8. Dopo il commit, mostra:

   ```bash
   git status --short
   git log -1 --oneline
   ```

9. Non fare push automaticamente. Se l'utente chiede anche il push, richiedi un secondo ok esplicito prima di eseguire:

   ```bash
   git push
   ```

## Se ci sono file non correlati

Se `git status --short` mostra file non chiaramente collegati al rilascio:

- non includerli automaticamente;
- elencali come "non inclusi salvo conferma";
- chiedi all'utente quali file includere.

## Se i check falliscono

- Non committare.
- Riporta il comando fallito.
- Riporta l'errore essenziale.
- Proponi il prossimo passo.

## Output consigliato prima del gate

```text
Release check pronta.

Stato:
- M src/...
- M src/...

Check:
- npm run lint ✅
- npm run test ✅
- npm run build ✅

Commit message proposta:
fix: improve mobile competitor search suggestions

Se confermi, eseguirò:
git add <file>
git commit -m "fix: improve mobile competitor search suggestions"

Confermi il commit?
```
