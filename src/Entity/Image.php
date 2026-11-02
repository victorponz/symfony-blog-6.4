<?php

namespace App\Entity;

use App\Repository\ImageRepository;
use Doctrine\ORM\Mapping as ORM;

#[ORM\Entity(repositoryClass: ImageRepository::class)]
class Image
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column(type: 'integer')]
    private $id;

    #[ORM\Column(type: 'string', length: 255)]
    private $File;

    #[ORM\Column(type: 'integer')]
    private $NumLikes;

    #[ORM\Column(type: 'integer')]
    private $NumViews;

    #[ORM\Column(type: 'integer')]
    private $NumDownloads;

    #[ORM\ManyToOne(targetEntity: Category::class, inversedBy: 'images')]
    private $Category;

    public function getId(): ?int
    {
        return $this->id;
    }

    public function getFile(): ?string
    {
        return $this->File;
    }

    public function setFile(string $File): self
    {
        $this->File = $File;

        return $this;
    }

    public function getNumLikes(): ?int
    {
        return $this->NumLikes;
    }

    public function setNumLikes(int $NumLikes): self
    {
        $this->NumLikes = $NumLikes;

        return $this;
    }

    public function getNumViews(): ?int
    {
        return $this->NumViews;
    }

    public function setNumViews(int $NumViews): self
    {
        $this->NumViews = $NumViews;

        return $this;
    }

    public function getNumDownloads(): ?int
    {
        return $this->NumDownloads;
    }

    public function setNumDownloads(int $NumDownloads): self
    {
        $this->NumDownloads = $NumDownloads;

        return $this;
    }

    public function getCategory(): ?Category
    {
        return $this->Category;
    }

    public function setCategory(?Category $Category): self
    {
        $this->Category = $Category;

        return $this;
    }
}
