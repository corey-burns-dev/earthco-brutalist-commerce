# Build and push production images from this PC to GHCR
push-images:
	docker build -f server/Dockerfile -t ghcr.io/burnsco/earthco-market-server:latest .
	docker build -f Dockerfile.client -t ghcr.io/burnsco/earthco-market-client:latest .
	docker push ghcr.io/burnsco/earthco-market-server:latest
	docker push ghcr.io/burnsco/earthco-market-client:latest
