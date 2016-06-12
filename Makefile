DOCKER_REPO=renegare/devops-certbot

BRANCH=$(shell git symbolic-ref --short HEAD)
VERSION=$(BRANCH)-$(shell git rev-parse HEAD)

build: clean setup version build-image
push: push-image

setup:
	mkdir -p tmp/{le-etc,le-log,le-var}

clean:
	rm -rf VERSION \
		tmp/*

version:
	echo $(VERSION) > VERSION

build-image:
	docker build -t $(DOCKER_REPO):latest .
	docker tag $(DOCKER_REPO):latest $(DOCKER_REPO):$(VERSION)
	-docker ps -qaf status=exited | xargs docker rm
	-docker images -qaf dangling=true | xargs docker rmi
	docker images | grep $(DOCKER_REPO)

push-image:
	docker push $(DOCKER_REPO):latest
	docker push $(DOCKER_REPO):$(VERSION)
