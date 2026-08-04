from openfda.download import download
from openfda.extract import extract


def run_pipeline():
    print("=" * 60)
    print(" SmartMedicationAI - Medicine ETL Pipeline ")
    print("=" * 60)

    download()
    extract()

    print("\nPipeline completed successfully!")


if __name__ == "__main__":
    run_pipeline()