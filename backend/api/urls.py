from django.urls import path, include
from api.views import (
    CompanyViewSet, UserViewSet, CarbonTransactionViewSet, MintCreditsView,
    RegisterView, MeView, PricingConfigView, DashboardStatsView,
    AdminCreateUserView, AssignVerifierView, ProjectReviewView,
    ProjectResubmitView, VerificationAssignmentViewSet,
)
from rest_framework import routers

router = routers.DefaultRouter()
router.register(
    r'CarbonLedger',
    CompanyViewSet,
    basename='company'
)
router.register(
    r'CarbonLedgerUsers',
    UserViewSet,
    basename='user'
)
router.register(
    r'CarbonLedgerTransactions',
    CarbonTransactionViewSet,
    basename='carbontransaction'
)
router.register(
    r'VerificationAssignments',
    VerificationAssignmentViewSet,
    basename='verificationassignment'
)

urlpatterns = [
    path('', include(router.urls)),
    path("company/<str:company_id>/mint/", MintCreditsView.as_view(), name="mint-credits"),
    path("register/", RegisterView.as_view(), name="register"),
    path("me/", MeView.as_view(), name="me"),
    path("pricing/", PricingConfigView.as_view(), name="pricing"),
    path("dashboard-stats/", DashboardStatsView.as_view(), name="dashboard-stats"),
    path("admin/users/", AdminCreateUserView.as_view(), name="admin-users"),
    path(
        "admin/projects/<int:project_id>/assign-verifier/",
        AssignVerifierView.as_view(),
        name="assign-verifier",
    ),
    path(
        "projects/<int:project_id>/review/",
        ProjectReviewView.as_view(),
        name="project-review",
    ),
    path(
        "projects/<int:project_id>/resubmit/",
        ProjectResubmitView.as_view(),
        name="project-resubmit",
    ),
]