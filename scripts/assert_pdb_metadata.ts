/**
 * Script: Assert PDB Metadata
 * 
 * Fetches protein structure metadata for specific PDB IDs (1A2B, 3ABC, 4HHB)
 * from the RCSB PDB API, parses key descriptors, and asserts that the 'title'
 * and 'organism' fields in the response match the known scientific data.
 * 
 * Run using: npm run assert-pdb OR npx tsx scripts/assert_pdb_metadata.ts
 */

import assert from "assert";

interface ExpectedMetadata {
  title: string;
  organism: string;
  isObsoleteOrNotFound?: boolean;
}

const EXPECTED_DATA: Record<string, ExpectedMetadata> = {
  "1A2B": {
    title: "HUMAN RHOA COMPLEXED WITH GTP ANALOGUE",
    organism: "Homo sapiens",
  },
  "4HHB": {
    title: "THE CRYSTAL STRUCTURE OF HUMAN DEOXYHAEMOGLOBIN AT 1.74 ANGSTROMS RESOLUTION",
    organism: "Homo sapiens",
  },
  "3ABC": {
    title: "N/A (Obsolete / Unreleased)",
    organism: "N/A",
    isObsoleteOrNotFound: true,
  }
};

async function assertPdbMetadata() {
  console.log("🚀 Starting RCSB PDB metadata validation script...\n");
  let passedCount = 0;
  let failedCount = 0;

  for (const id of Object.keys(EXPECTED_DATA)) {
    console.log(`--------------------------------------------------`);
    console.log(`🔍 Checking PDB ID: ${id}`);
    const expected = EXPECTED_DATA[id];

    try {
      // 1. Fetch core entry metadata
      const entryUrl = `https://data.rcsb.org/rest/v1/core/entry/${id}`;
      const entryRes = await fetch(entryUrl);

      if (expected.isObsoleteOrNotFound) {
        console.log(`ℹ️  ID ${id} is known to be obsolete or not found.`);
        console.log(`👉 Status code: ${entryRes.status} (Expected: 404).`);
        assert.strictEqual(
          entryRes.status,
          404,
          `Expected ID ${id} to return 404 status code (Not Found).`
        );
        console.log(`✅ Assertion passed for obsolete ID: ${id}`);
        passedCount++;
        continue;
      }

      assert.strictEqual(
        entryRes.status,
        200,
        `Expected status 200 for PDB ID ${id}, but got ${entryRes.status}`
      );

      const entryData = await entryRes.json();
      const actualTitle = entryData.struct?.title;
      console.log(`📝 Actual Title: "${actualTitle}"`);
      console.log(`🎯 Expected Title: "${expected.title}"`);

      // Assert title matches
      assert.ok(actualTitle, `PDB Entry ${id} is missing a title`);
      assert.strictEqual(
        actualTitle.toUpperCase().trim(),
        expected.title.toUpperCase().trim(),
        `Title mismatch for PDB ID ${id}`
      );
      console.log(`✅ Title Verified`);

      // 2. Fetch polymer entity metadata to discover the host organism
      const entityUrl = `https://data.rcsb.org/rest/v1/core/polymer_entity/${id}/1`;
      const entityRes = await fetch(entityUrl);
      assert.strictEqual(
        entityRes.status,
        200,
        `Expected entity resource status 200 for PDB ID ${id}, but got ${entityRes.status}`
      );

      const entityData = await entityRes.json();
      // Safely extract organism scientific name
      const actualOrganism =
        entityData.rcsb_entity_source_organism?.[0]?.ncbi_scientific_name ||
        entityData.rcsb_entity_source_organism?.[0]?.scientific_name;

      console.log(`🧬 Actual Organism: "${actualOrganism}"`);
      console.log(`🎯 Expected Organism: "${expected.organism}"`);

      // Assert organism matches
      assert.ok(actualOrganism, `PDB Entry ${id} is missing organism data`);
      assert.strictEqual(
        actualOrganism.toLowerCase().trim(),
        expected.organism.toLowerCase().trim(),
        `Organism mismatch for PDB ID ${id}`
      );
      console.log(`✅ Organism Verified`);

      passedCount++;
    } catch (error: any) {
      console.error(`❌ Assertion failed or fetch error occurred for PDB ID ${id}:`);
      console.error(`   Reason: ${error.message}`);
      failedCount++;
    }
  }

  console.log(`\n==================================================`);
  console.log(`📊 Validation Summary:`);
  console.log(`   - Verified Successfully: ${passedCount}`);
  console.log(`   - Failed Verification:  ${failedCount}`);
  console.log(`==================================================`);

  if (failedCount > 0) {
    process.exit(1);
  } else {
    console.log("🌟 All PDB metadata assertions completed successfully!");
    process.exit(0);
  }
}

assertPdbMetadata().catch((err) => {
  console.error("Fatal script error:", err);
  process.exit(1);
});
