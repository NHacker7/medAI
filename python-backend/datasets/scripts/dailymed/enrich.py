import pandas as pd

from config import (
    DAILYMED,
    CLEANED,
    TEST_MODE,
    TEST_LIMIT,
    CHECKPOINT_INTERVAL,
)
from utils import log

from .enricher import enrich_medicine
from .checkpoint import (
    load_checkpoint,
    save_checkpoint,
)


# ==========================================================
# Configuration
# ==========================================================

INPUT_FILE = DAILYMED / "dailymed_filtered.csv"
OUTPUT_FILE = CLEANED / "dailymed_enriched.csv"


# ==========================================================
# Main Enrichment Pipeline
# ==========================================================

def enrich():

    log("=" * 60)
    log("Starting DailyMed Enrichment")
    log("=" * 60)

    # ------------------------------------------------------
    # Load input dataset
    # ------------------------------------------------------

    df = pd.read_csv(INPUT_FILE)

    if TEST_MODE:
        log(f"TEST MODE ENABLED ({TEST_LIMIT} medicines)")
        df = df.head(TEST_LIMIT)

    total = len(df)

    # ------------------------------------------------------
    # Load existing processed SETIDs
    # ------------------------------------------------------

    existing_setids = set()

    if OUTPUT_FILE.exists() and not TEST_MODE:

        try:

            existing_df = pd.read_csv(OUTPUT_FILE)

            if "setid" in existing_df.columns:

                existing_setids = set(
                    existing_df["setid"]
                    .dropna()
                    .astype(str)
                )

                log(
                    f"Existing enriched records : "
                    f"{len(existing_setids)}"
                )

        except Exception as e:

            log(f"Could not read existing output : {e}")

    # ------------------------------------------------------
    # Checkpoint / Resume
    # ------------------------------------------------------

    if TEST_MODE:

        start = 0
        processed = 0
        success = 0
        failed = 0

        # Test mode should always create a fresh output
        if OUTPUT_FILE.exists():
            OUTPUT_FILE.unlink()

        existing_setids.clear()

    else:

        checkpoint = load_checkpoint("dailymed")

        start = checkpoint["last_index"]
        processed = checkpoint["processed"]
        success = checkpoint["success"]
        failed = checkpoint["failed"]

    log(f"Resume From Index : {start}")
    log(f"Already Processed : {processed}")
    log(f"Success : {success}")
    log(f"Failed : {failed}")

    # ------------------------------------------------------
    # Main loop
    # ------------------------------------------------------

    for index in range(start, total):

        row = df.iloc[index]

        setid = str(row["setid"])

        # --------------------------------------------------
        # Duplicate protection
        # --------------------------------------------------

        if not TEST_MODE and setid in existing_setids:

            log(
                f"[{index + 1}/{total}] "
                f"Already enriched - skipping : {setid}"
            )

            continue

        log(
            f"[{index + 1}/{total}] "
            f"{row['title']}"
        )

        try:

            # --------------------------------------------------
            # Fetch DailyMed information
            # --------------------------------------------------

            data = enrich_medicine(setid)

            # --------------------------------------------------
            # Prepare output record
            # --------------------------------------------------

            record = pd.DataFrame([{

                "setid": setid,

                "title": row["title"],

                "published_date": row["published_date"],

                "spl_version": row["spl_version"],

                "ndc_count": len(
                    data.get("ndcs", [])
                ),

                "package_count": len(
                    data.get("packaging", [])
                ),

                "image_count": len(
                    data.get("media", [])
                ),

                "history_versions": len(
                    data.get("history", [])
                )

            }])

            # --------------------------------------------------
            # Write immediately
            # --------------------------------------------------

            record.to_csv(
                OUTPUT_FILE,
                mode="a",
                header=not OUTPUT_FILE.exists(),
                index=False
            )

            # --------------------------------------------------
            # Update state
            # --------------------------------------------------

            existing_setids.add(setid)

            processed += 1
            success += 1

        except Exception as e:

            processed += 1
            failed += 1

            log(
                f"Failed : {setid} -> {e}"
            )

        # ------------------------------------------------------
        # Save checkpoint
        # ------------------------------------------------------

        if (index + 1) % CHECKPOINT_INTERVAL == 0:

            save_checkpoint(
                module_name="dailymed",

                last_index=index + 1,

                processed=processed,

                success=success,

                failed=failed,

                last_setid=setid
            )

            log(
                f"Checkpoint Saved ({index + 1})"
            )

    # ------------------------------------------------------
    # Final checkpoint
    # ------------------------------------------------------

    save_checkpoint(
        module_name="dailymed",

        last_index=total,

        processed=processed,

        success=success,

        failed=failed,

        last_setid=""
    )

    # ------------------------------------------------------
    # Final summary
    # ------------------------------------------------------

    log("=" * 60)

    log(
        f"Saved -> {OUTPUT_FILE}"
    )

    log(
        f"Processed : {processed}"
    )

    log(
        f"Success : {success}"
    )

    log(
        f"Failed : {failed}"
    )

    log(
        f"Unique SETIDs : {len(existing_setids)}"
    )

    log("=" * 60)


# ==========================================================
# Entry Point
# ==========================================================

if __name__ == "__main__":
    enrich()