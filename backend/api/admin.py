from django.contrib import admin
from api.models import Company,User
# Register your models here.

class CompanyAdmin(admin.ModelAdmin):
    list_display=('name',"type",'active')
class UserAdmin(admin.ModelAdmin):
    list_display=('username','role','active')

admin.site.register(Company,CompanyAdmin)
admin.site.register(User,UserAdmin)