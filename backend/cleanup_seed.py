from api.models import Company, CarbonTransaction

# Delete duplicate company (id=2) and its transaction
dup_tx = CarbonTransaction.objects.filter(project_id=2)
print(f"Deleting {dup_tx.count()} transaction(s) for duplicate company id=2")
dup_tx.delete()

dup = Company.objects.filter(id=2)
print(f"Deleting duplicate: {list(dup.values('id','name'))}")
dup.delete()

print("Remaining companies:", list(Company.objects.all().values('id','name','status')))
print("Remaining transactions:", list(CarbonTransaction.objects.all().values('id','project_id','credits','transaction_type')))
