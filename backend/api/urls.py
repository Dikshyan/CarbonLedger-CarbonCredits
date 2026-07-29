
from django.urls import path, include  
from api.views import CompanyViewSet, UserViewSet , CarbonTransactionViewSet , MintCreditsView
from rest_framework import routers  


router=routers.DefaultRouter()
router.register(r'CarbonLedger',CompanyViewSet)
router.register(r'CarbonLedgerUsers',UserViewSet)
router.register(r'CarbonLedgerTransactions', CarbonTransactionViewSet)


urlpatterns = [
    path('', include(router.urls)),
    path("company/<str:company_id>/mint/",MintCreditsView.as_view(),name="mint-credits",),
]
