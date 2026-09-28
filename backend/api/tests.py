from django.contrib.auth.models import User as AuthUser
from django.core import mail
from rest_framework import status
from rest_framework.test import APITestCase
from api.models import Company, User, VerificationAssignment


class CompanyVerificationTests(APITestCase):
    def setUp(self):
        # Admin user
        self.admin_auth = AuthUser.objects.create_superuser("admin_user", "admin@test.com", "Password123!")
        self.admin_user = User.objects.create(
            auth_user=self.admin_auth,
            username="admin_user",
            email="admin@test.com",
            role="Admin",
            active=True,
        )

        # Regular user
        self.buyer_auth = AuthUser.objects.create_user("buyer_user", "buyer@test.com", "Password123!")
        self.buyer_user = User.objects.create(
            auth_user=self.buyer_auth,
            username="buyer_user",
            email="buyer@test.com",
            role="Company Buyer",
            active=True,
        )

        # Target Company (Pending)
        self.company = Company.objects.create(
            name="Sundarbans Eco Restoration NGO",
            location="Sundarbans, West Bengal",
            about="Coastal mangrove regeneration initiative.",
            type="Blue Carbon Project",
            status=Company.STATUS_PENDING,
            active=False,
            contact_email="contact@sundarbans-ngo.org",
            registration_number="NGO-WB-2024-9912",
            credential_document="https://registry.documents/ngo_charter.pdf",
            project_scope="Mangrove canopy expansion across 1,200 hectares.",
            objectives="Sequester 300,000 tCO2e over 10 years.",
            estimated_budget="$750,000 USD",
            target_demographics="Coastal artisanal fishing communities.",
        )

    def test_admin_can_verify_company(self):
        self.client.force_authenticate(user=self.admin_auth)
        res = self.client.post(f"/api/v1/CarbonLedger/{self.company.id}/verify/")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.company.refresh_from_db()
        self.assertEqual(self.company.status, Company.STATUS_VERIFIED)
        self.assertTrue(self.company.active)
        self.assertIsNotNone(self.company.reviewed_at)
        self.assertEqual(self.company.reviewed_by, self.admin_user)
        # Check email sent
        self.assertGreater(len(mail.outbox), 0)
        self.assertIn("Registration Approved", mail.outbox[-1].subject)

    def test_admin_can_reject_company_with_reason(self):
        self.client.force_authenticate(user=self.admin_auth)
        reason = "Credential document missing state accreditation seal."
        res = self.client.post(f"/api/v1/CarbonLedger/{self.company.id}/reject/", {"reason": reason}, format="json")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.company.refresh_from_db()
        self.assertEqual(self.company.status, Company.STATUS_REJECTED)
        self.assertFalse(self.company.active)
        self.assertEqual(self.company.rejection_reason, reason)
        # Check email sent
        self.assertGreater(len(mail.outbox), 0)
        self.assertIn("Registration Status Update", mail.outbox[-1].subject)

    def test_non_admin_cannot_verify(self):
        self.client.force_authenticate(user=self.buyer_auth)
        res = self.client.post(f"/api/v1/CarbonLedger/{self.company.id}/verify/")
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)


class VerificationAssignmentTests(APITestCase):
    def setUp(self):
        # Government Official
        self.gov_auth = AuthUser.objects.create_user("gov_official", "gov@ministry.gov", "Password123!")
        self.gov_user = User.objects.create(
            auth_user=self.gov_auth,
            username="gov_official",
            email="gov@ministry.gov",
            role="Government Official",
            active=True,
        )

        # Field Verifier
        self.verifier_auth = AuthUser.objects.create_user("dr_sarah_mrv", "sarah@verifier.org", "Password123!")
        self.verifier_user = User.objects.create(
            auth_user=self.verifier_auth,
            username="dr_sarah_mrv",
            email="sarah@verifier.org",
            role="Verifier",
            region="Sundarbans, West Bengal",
            domain_expertise="Mangrove Ecosystems, Remote Sensing, Soil Carbon",
            active=True,
        )

        # Project
        self.project = Company.objects.create(
            name="Sundarbans Mangrove Project",
            location="Sundarbans, West Bengal",
            about="Tidal mangrove wetland regeneration.",
            type="Blue Carbon Project",
            status=Company.STATUS_PENDING,
            active=True,
        )

    def test_recommendations_engine(self):
        self.client.force_authenticate(user=self.gov_auth)
        res = self.client.get(f"/api/v1/VerificationAssignments/recommendations/?project_id={self.project.id}")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        recs = res.data
        self.assertGreater(len(recs), 0)
        top = recs[0]
        self.assertEqual(top["verifier_id"], self.verifier_user.id)
        self.assertGreaterEqual(top["score"], 80)
        self.assertTrue(any("Regional jurisdiction match" in r for r in top["reasons"]))

    def test_assign_verifier_workflow(self):
        self.client.force_authenticate(user=self.gov_auth)
        payload = {
            "project": self.project.id,
            "verifier": self.verifier_user.id,
            "priority": "High",
            "due_date": "2026-11-30",
            "notes": "Verify canopy density and soil core sampling.",
        }
        res = self.client.post("/api/v1/VerificationAssignments/", payload, format="json")
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        assignment_id = res.data["id"]

        assignment = VerificationAssignment.objects.get(id=assignment_id)
        self.assertEqual(assignment.status, VerificationAssignment.STATUS_ASSIGNED)
        self.assertEqual(assignment.assigned_by, self.gov_user)
        self.assertEqual(assignment.verifier, self.verifier_user)
        self.assertEqual(assignment.priority, "High")
        # Check email was dispatched to verifier
        self.assertGreater(len(mail.outbox), 0)
        self.assertIn("New Verification Assignment", mail.outbox[-1].subject)

        # Verifier submits report
        self.client.force_authenticate(user=self.verifier_auth)
        report_payload = {
            "status": "Completed",
            "field_report": "Completed ground-truthing; canopy density exceeds 70%. Approved.",
            "evidence_document": "https://ipfs.io/ipfs/QmAuditEvidence123",
        }
        res2 = self.client.post(f"/api/v1/VerificationAssignments/{assignment_id}/submit_report/", report_payload, format="json")
        self.assertEqual(res2.status_code, status.HTTP_200_OK)
        assignment.refresh_from_db()
        self.assertEqual(assignment.status, "Completed")
        self.assertIsNotNone(assignment.completed_at)
        self.assertEqual(assignment.evidence_document, "https://ipfs.io/ipfs/QmAuditEvidence123")

