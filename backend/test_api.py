import io
import cv2
import numpy as np
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def generate_synthetic_test_image() -> bytes:
    """Generates a synthetic test image."""
    img = np.full((300, 300, 3), (40, 180, 50), dtype=np.uint8)
    cv2.circle(img, (150, 150), 60, (255, 200, 0), -1)
    _, buffer = cv2.imencode(".jpg", img)
    return buffer.tobytes()


def run_tests():
    print("=== [TEST] WildGotcha Backend Test Suite ===")

    # 1. Health Endpoint
    print("\n1. Testing GET /health ...")
    health_resp = client.get("/health")
    print(f"Status Code: {health_resp.status_code}")
    print(f"Response: {health_resp.json()}")
    assert health_resp.status_code == 200, "Health check failed"

    # 2. Root Documentation
    print("\n2. Testing GET / ...")
    root_resp = client.get("/")
    print(f"Status Code: {root_resp.status_code}")
    print(f"Response: {root_resp.json()}")
    assert root_resp.status_code == 200, "Root endpoint failed"

    # 3. Identify Endpoint with non-wildlife (synthetic circle)
    print("\n3. Testing POST /api/v1/identify with non-wildlife image ...")
    test_image_bytes = generate_synthetic_test_image()
    files = {"file": ("test_object.jpg", test_image_bytes, "image/jpeg")}
    data = {
        "user_id": "test_bot_01",
        "latitude": "37.7749",
        "longitude": "-122.4194",
    }

    identify_resp = client.post("/api/v1/identify", files=files, data=data)
    print(f"Status Code: {identify_resp.status_code}")
    res_data = identify_resp.json()
    print(f"Result Common Name: {res_data.get('common_name')}")
    print(f"Result is_wildlife: {res_data.get('is_wildlife')}")
    print(f"Result Message: {res_data.get('message')}")
    assert identify_resp.status_code == 200, "Identification request failed"
    # Should correctly identify as non-wildlife rather than a false positive butterfly!
    assert res_data.get("is_wildlife") is False, "Expected non-wildlife to be rejected"

    # 4. Scans history
    print("\n4. Testing GET /api/v1/scans ...")
    scans_resp = client.get("/api/v1/scans")
    print(f"Status Code: {scans_resp.status_code}")
    scans_data = scans_resp.json()
    print(f"Total Scans in Dex: {scans_data.get('total')}")
    assert scans_resp.status_code == 200, "Scans history failed"

    # 5. Stats endpoint
    print("\n5. Testing GET /api/v1/stats ...")
    stats_resp = client.get("/api/v1/stats")
    print(f"Status Code: {stats_resp.status_code}")
    print(f"Stats: {stats_resp.json()}")
    assert stats_resp.status_code == 200, "Stats endpoint failed"

    print("\n[SUCCESS] ALL BACKEND SMOKE TESTS PASSED SUCCESSFULLY!")


if __name__ == "__main__":
    run_tests()
